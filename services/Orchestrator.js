const NetworkGateway = require('./NetworkGateway');
const ClientGateway = require('./ClientGateway');
const APIRouter = require('./APIRouter');
const RequestHandler = require('./RequestHandler');
const UserManager = require('./UserManager');
const ResourceManager = require('./ResourceManager');
const ModelAccessor = require('./ModelAccessor');
const DeviceControler = require('./DeviceControler');
const OperationComposer = require('./OperationComposer');
const DataHandler = require('./DataHandler');
const DecisionProcessor = require('./DecisionProcessor');
const Parser = require('./Parser');
const JobManager = require('./JobManager');

const Measurement = require('../classes/measurement.class');
const Event = require('../classes/event.class');
const Point = require('../classes/point.class');
class Orchestrator extends ModelAccessor{
  constructor(app, eventHandler, userManager, systemOptions, secret) {
    super();
    this.app = app;
    this.eventHandler = eventHandler;
    this.networkGateway = new NetworkGateway(app, eventHandler);
    this.parser = new Parser(app);
    this.userManager = userManager;
    this.resourceManagers = {};

  }
  async init() {
    const self = this;
    self.eventHandler.initListeners();
    this.eventHandler.emit('cloudStart', self.constructor.name, {});
    self.requestHandler = new RequestHandler(self.app, self, self.userManager, self.eventHandler);
    self.clientGateway = new ClientGateway(self.app, self, self.requestHandler, self.eventHandler);
    self.APIRouter = new APIRouter(self.app, self, self.requestHandler, self.eventHandler);
    self.networkGateway.listen(self, self.inputPayload);
    self.requestHandler.initHandlers();
    self.APIRouter.initRoutes();

    let rms = await self.loadManagers();
    if (rms.length == 0) {
      this.eventHandler.emit('NoRm', self.constructor.name, {});
    }
    await Promise.all(rms.map(async (rm) => {
      await self.initResourceManager(rm).then((rm) => this.eventHandler.emit('rmReady', rm.constructor.name, {rmId:rm.id}))
    })).then(()=>{
      self.clientGateway.listen(self.requestHandler.handlers);
      this.eventHandler.emit('cloudReady', self.constructor.name, {rmsLoaded:Object.keys(this.resourceManagers)});
    })
  }

  async initResourceManager(resourceManagerModel) {
    const self = this;
    const {
      id,
      network_id,
      device_map_id,
      point_ids,
      recipe_id,
      auto
    } = resourceManagerModel;

    let systemConfig = self.loadSystemConfiguration();
    let operationSetup = self.loadOperationSetup();

    const rm = new ResourceManager(self, id, network_id, device_map_id, point_ids, recipe_id, auto, systemConfig, operationSetup, this.eventHandler);
    await rm.loadData().then(() => this.eventHandler.emit('rmLoadData', rm.constructor.name, {rmId:rm.id}));
    // process.exit(1)
    rm.operationComposer = new OperationComposer(rm, self.eventHandler);
    rm.deviceControler = new DeviceControler(rm, self.eventHandler);
    rm.jobManager = new JobManager(rm, self.eventHandler);

    await rm.deviceControler.loadData().then(() => {
      this.eventHandler.emit('devCtrlLoadData', rm.deviceControler.constructor.name, {rmId:rm.id});
      this.eventHandler.emit('deviceTree', rm.deviceControler.constructor.name, {rmId:rm.id, tree:rm.deviceControler.tree});
    });

    let activeRmcs = rm.deviceControler.getActiveRootControlers();
    await rm.operationComposer.initializeOperationProfiles(activeRmcs).then(() => this.eventHandler.emit('initOperationProfiles', rm.operationComposer.constructor.name, {rmId:rm.id}));
    rm.dataHandler = new DataHandler(rm, self.eventHandler);
    rm.decisionProcessor = new DecisionProcessor(rm, rm.recipe, this.parser, rm.jobManager, null, self.eventHandler);
    await rm.decisionProcessor.initModels();
    if(rm.auto){
      rm.jobManager.createIntervalCronSchedule(240, 's', ()=>{
        let deps = rm.deviceControler.collectRecipeDependencies(rm.recipe);
        rm.decisionProcessor.setDependencies(deps);
          rm.decisionProcessor.processData('dripModel', "1621111111111", new Date().getTime());
      })
    }

    self.resourceManagers[id] = rm;
    return rm;
  }
  async inputPayload(payload, type) {
    const self = this;
    const rms = Object.values(this.resourceManagers).find((rm) => {return rm.networkId == payload.end_device_ids.application_ids.application_id})
    const id = payload.correlation_ids[0].replace(/[as:up]/g, '');
    const ci = rms.deviceControler.getInterfaces([payload.end_device_ids.device_id])[0];
    if(!ci){
      this.eventHandler.emit('payloadCiNotExist', self.constructor.name, {rmId:rms.id, ciId:payload.end_device_ids.device_id})
    }
    if(!ci.mcId){
      this.eventHandler.emit('payloadNotRelatedMc', self.constructor.name, {rmId:rms.id, ciId:payload.end_device_ids.device_id})
    }
    let rmc = rms.deviceControler.getRootControler(ci.mcId);
    const timestamp = new Date(payload.received_at).getTime();
    if(type == 'uplink'){
      let raw = payload.uplink_message.decoded_payload.raw;
      const b64 = payload.uplink_message.frm_payload;
      let info = {
        f_cnt: payload.uplink_message.f_cnt,
        f_port: payload.uplink_message.f_port,
        frm_payload: payload.uplink_message.frm_payload,
        gw_id: payload.uplink_message.rx_metadata[0].gateway_ids.gateway_id,
        rssi: payload.uplink_message.rx_metadata[0].rssi,
        snr: payload.uplink_message.rx_metadata[0].snr,
        channel_index: payload.uplink_message.rx_metadata[0].channel_index,
        channel_rssi: payload.uplink_message.rx_metadata[0].channel_rssi,
        spreading_factor: payload.uplink_message.settings.data_rate.lora.spreading_factor,
        bandwidth: payload.uplink_message.settings.data_rate.lora.bandwidth,
        data_rate_index: payload.uplink_message.settings.data_rate_index,
        coding_rate: payload.uplink_message.settings.coding_rate,
        frequency: payload.uplink_message.settings.frequency,
        toa: null,
      }
      let uplink = null;

      if(rmc.devGroup.legacy){
        console.log('Legacy rmc uplink received.')
        if(!rmc.op){
          rms.operationComposer.initializeOperationProfile(rmc).then(()=>{
            rms.deviceControler.initializeControler(rmc);
          });
        }
        raw = ['r', Math.round(timestamp / 1000), '_'].concat(raw.split('_').filter(part => part != '').map((v, i) => {
          return i+'m'+v;
        }).join('_')).join('');
        console.log('legacy temporary protocol compatibility interpreter', raw);
        rms.deviceControler.createDownlink({peer:rmc.ci, data: {text:Math.floor(Math.random() * 2).toString()}}, rms.deviceControler.sendDownlink, timestamp+50000);
      }

      uplink = await rms.deviceControler.gatherUplink(id, raw, b64, timestamp, ci, info);
      if(uplink.command == 'init'){
        this.eventHandler.emit('edgeInitRequest', self.constructor.name, {rmId:rms.id, rmcId:rmc.id})
        let edgeInitDevGroup = uplink.data[0][1];
        let cloudMcDevGroup = rmc.devGroup.id;
        if(edgeInitDevGroup != cloudMcDevGroup){
          this.eventHandler.emit('initDevGroupMismatch', self.constructor.name, {rmId:rms.id, rmcId:rmc.id, edgeInitDevGroup:edgeInitDevGroup, cloudMcDevGroup:cloudMcDevGroup})
          return;
        }
        rmc.isAlive();
        rms.operationComposer.initializeOperationProfile(rmc).then(()=>{
          rms.deviceControler.initializeControler(rmc);
          rms.deviceControler.triggerCommand('operation_profile', rmc.ci, rmc);
        });
      }
      if(uplink.command == 'continue'){
        this.eventHandler.emit('edgeContinueRequest', self.constructor.name, {rmId:rms.id, rmcId:rmc.id})
        rms.deviceControler.triggerCommand('operation_profile', rmc.ci, rmc);
      }
      if(uplink.command == 'ping'){
        this.eventHandler.emit('edgePingUplink', self.constructor.name, {rmId:rms.id, rmcId:rmc.id})
        rmc.isAlive();
        rms.deviceControler.triggerCommand('action', ci, rmc);
      }
      if(uplink.command == 'report'){
        this.eventHandler.emit('edgeReportUplink', self.constructor.name, {rmId:rms.id, rmcId:rmc.id})
        const inputData = await rms.dataHandler.fetchEdgeReports(uplink, timestamp);
        self.clientNotify(rms.id, inputData);
        rms.deviceControler.triggerCommand('action', ci, rmc);
      }
    }
    else if (type == 'join'){
      const join = await rms.deviceControler.gatherJoin(id, timestamp, ci);
    }
  }
  async generateResourceManagerOptions(params) {
    const self = this;
    const systemConfig = self.loadSystemConfiguration();
    const {userId} = params;
    return await self.loadDefaultOptions().then((data) => {
      let generationOptions = {
        options:{
            tasks:Object.keys(systemConfig.tasks),
            location_types:["station", "crop", "field", "collector", "route", "resource"],
            specifications: systemConfig.specifications,
            operation:{
              minimumUplinkInterval: systemConfig.communication.protocol.edge.minimumUplinkInterval
            }
        },
        recipes: data[0],
        device_groups: data[1],
        communication_interfaces: data[2].filter((ci)=>ci.protocol == 'lora'),
        operation_setup: self.loadOperationSetup()
      };
      return {data: {options:generationOptions }};
    });
  }
  async readResourceManager(params){
    const {rmId} = params;
    let rm = this.resourceManagers[rmId];
    return {
      rm: rm,
      data: {
        id: rm.id,
        tree: Object.keys(rm.deviceControler.tree),
        points: rm.points.map(p => p.id)
      }
    }
  }

  async readPoints(params) {
    const {rmId, ids} = params;
    let rm = this.resourceManagers[rmId];
    let points = rm.getPoints(ids);
    return {
      data: {
        points: points.map(p => p.flatten())
      }
    }
  }

  async readEvents(params) {
    const {rmId, ids} = params;
    let rm = this.resourceManagers[rmId];
    let events = await rm.dataHandler.loadEvents(ids);
    return {
      data: {
        events: events
      }
    }
  }

  async readMicroControlers(params) {
    let self = this;
    const {rmId, ids} = params;
    let rm = this.resourceManagers[rmId];
    let mcs = rm.deviceControler.getControlers(ids);
    return {data: {mcs: mcs.map(mc => mc.flatten())}};
  }

  async readCommunicationInterfaces(params) {
    let self = this;
    const {rmId, ids} = params;
    let rm = this.resourceManagers[rmId];
    let cis = rm.deviceControler.getInterfaces(ids);
    return {data: {cis: cis}};
  }

  async readDevices(params) {
    let self = this;
    const {rmId, ids} = params;
    let rm = this.resourceManagers[rmId];
    let devs = rm.deviceControler.getDevices(ids)
    return {data: {devs: devs.map(d => d.flatten())}};
  }

  async readOperationProfiles(params) {
    let self = this;
    const {rmId, ids} = params;
    let rm = this.resourceManagers[rmId];
    let ops = rm.operationComposer.getOperationProfiles(ids)
    return {data: {ops: ops}};
  }

  async readDevicesReports(params) {
    let self = this;
    const {rmId, devIds, from, to} = params;
    let rm = this.resourceManagers[rmId];
    let measurements = await rm.dataHandler.fetchMeasurements(devIds, from, to);
    let events = await rm.dataHandler.fetchEvents(devIds, from, to);
    return {data: {measurements: measurements, events: events}};
  }

  async readDevicesActions(params) {
    let self = this;
    const {rmId, devIds, from, to} = params;
    let rm = this.resourceManagers[rmId];
    let actions = await rm.dataHandler.fetchActions(devIds, from, to);
    return {data: {actions: actions}};
  }

  async readComInterfacePayloads(params) {
    let self = this;
    const {rmId, ciIds, from, to} = params;
    let rm = this.resourceManagers[rmId];
    let uplinks = await rm.dataHandler.fetchUplinks(ciIds, from, to);
    let downlinks = await rm.dataHandler.fetchDownlinks(ciIds, from, to);
    let joins = await rm.dataHandler.fetchJoins(ciIds, from, to);
    return {data: {
      uplinks: uplinks.map(u => u.flatten()),
      downlinks: downlinks.map(d => d.flatten()),
      joins:joins.map(j => j.flatten())
    }};
  }
  async createNewResourceManager(params, user) {
    const self = this;
    this.eventHandler.emit('newRmCreation', self.constructor.name, {params:params});
    const {points, device_maps, resource_managers, operation_setup, network_id} = params;
    let tmp_points_correlation = {};
    let allPoints = [];
    await Promise.all(points.map(async (p) => {
      let tmp_id = p.id;
      delete p.id;
      let point = await self.createPoint(p);
      tmp_points_correlation[tmp_id] = point.id;
      allPoints.push(point.id);
    }));
    let tmp_device_maps_correlation = {};
    await Promise.all(device_maps.map(async (dm) => {
      let rmcs = [];
      await Promise.all(dm.nodes.map(async (mc) => {
        mc.point_id = tmp_points_correlation[mc.point_id];
        mc.active = true;
        let microControler = await self.createMicroControler(mc);
        rmcs.push({
          rmc_id: microControler.id
        });
      }));
      dm.nodes = rmcs;
      let tmp_id = dm.id;
      delete dm.id;
      let deviceMapModel = await self.createDeviceMap(dm);
      tmp_device_maps_correlation[tmp_id] = deviceMapModel.id;
    }));
    let tmp_rms_correlation = {};
    let rms = await Promise.all(resource_managers.map(async (rm) => {
      let tmp_id = rm.id;
      delete rm.id;
      rm.device_map_id = tmp_device_maps_correlation[rm.device_map_id];
      rm.point_ids = allPoints;
      rm.network_id = network_id;
      let resourceManagerModel = await self.createManager(rm);
      tmp_rms_correlation[tmp_id] = resourceManagerModel.id;
      return await self.initResourceManager(resourceManagerModel)
    }));
    let rmId = rms[0].id;
    if(user){
      self.userManager.assignRmToUser(user.id, rmId);
    }
    return {
      data: {
        id: rmId,
        tree: Object.keys(rms[0].deviceControler.tree),
        points: rms[0].points.map(p => p.id)
      }
    }
  }

  async deleteExistingResourceManager(params, user){
    const self = this;
    const {rmId} = params;
    let rm = this.resourceManagers[rmId];
    if(rm){
      let mcsRes, pointsRes, devMapRes, rmRes;
      mcsRes = await rm.deviceControler.deleteMicroControlers(Object.keys(rm.deviceControler.controlers));
      pointsRes = await rm.deletePoints(rm.points.map(p => p.id));
      devMapRes = await self.deleteDeviceMap(rm.deviceMap.id);
      rmRes = await self.deleteManager(rmId);
      self.userManager.detouchRmToUser(user.id, rmId);
      let responses = [mcsRes, pointsRes, devMapRes, rmRes];
      return {
        data: {
          message: responses.join(' ')
        }
      }
    } else {
      return {
        data: {
          error: {
            message: 'RM not exist or not loaded.'
          }
        }
      }
    }



  }
  async createNewPoints(params){
    const {rmId, nodes} = params;
    let rm = this.resourceManagers[rmId];
    let points = await rm.createPoints(nodes);
    return {
      data: {
        points: points.map(p => p.flatten())
      }
    }
  }

  async updateExistingPoints(params){
    const {rmId, nodes} = params;
    let rm = this.resourceManagers[rmId];
    let points = await rm.updatePoints(nodes);
    return {
      data: {
        points: points.map(p => p.flatten())
      }
    }
  };

  async deleteExistingPoints(params){
    const {rmId, ids} = params;
    let rm = this.resourceManagers[rmId];
    let response = await rm.deletePoints(ids);
    return {
      data: {
        message: response
      }
    }
  };
  async createNewMicrocontrolers(params){
    const self = this;
    const {rmId, nodes} = params;
    let rm = this.resourceManagers[rmId];
    let opCallback = rm.operationComposer.initializeOperationProfiles.bind(rm.operationComposer);
    let mcs = await rm.deviceControler.createMicroControlers(nodes, opCallback);
    return {data: {mcs: mcs.map(mc => mc.flatten())}};
  }

  async deleteExistingMicrocontrolers(params){
    const {rmId, ids} = params;
    let rm = this.resourceManagers[rmId];
    let response = await rm.deviceControler.deleteMicroControlers(ids);
    return {
      data: {
        message: response
      }
    }
  };
  async createNewActions(params){
    const self = this;
    const {rmId, commands} = params;
    let rm = this.resourceManagers[rmId];
    let actions = await Promise.all(commands.map(async (c) => {
      let devId = c[0];
      let value = c[1];
      let timestamp = c[2];
      let dev = [rm.deviceControler.devices.find(d => d.id === devId)];
      return await rm.decisionProcessor.createCommand('action', dev, value, 'manual', timestamp);
    }));
    return {data: {
      actions: actions.map(a => a.flatten()),
    }}
  }


  async readUser(params) {
    let self = this;
    const {id} = params;
    let user = await self.userManager.loadUser(id);
    delete user.password;
    return {data: {user: user}};
  }

  clientNotify(rmId, inputData){
    let self = this;
    let structedData = {data: {}};
    console.log('inputData',inputData)
    inputData.forEach((d) => {
      if(!d) return false;
      let key = d.constructor.name.toLowerCase();
      if(!structedData.data[key]){
        structedData.data[key] = [d];
      } else {
        structedData.data[key].push(d);
      }
    })
    self.clientGateway.updateNotification(rmId, structedData);
  }

}



module.exports = Orchestrator;
