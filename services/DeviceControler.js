const IORouter = require('./IORouter');
const Device = require('../classes/device.class');
const Actuator = require('../classes/actuator.class');
const Sensor = require('../classes/sensor.class');
const CommunicationInterface = require('../classes/communicationInterface.class');
const MicroControler = require('../classes/microControler.class');
const OperationProfile = require('../classes/operationProfile.class');
class DeviceControler extends IORouter {
  constructor(rm, eventHandler) {
    super(rm, eventHandler);
    this.config = rm.getSystemConfig() || {};
    this.setup = rm.getOperationSetup() || {};
    this.deviceMap = rm.deviceMap || {};
    this.tree = {};
    this.controlers = {};
    this.devSpecifications = {};
    this.devGroups = {};
    this.devices = [];
  }
  async loadData() {
    return await this.rm.o.loadDeviceSpecifications().then(async(devSpecifications) => {
      this.devSpecifications = devSpecifications;
      return await this.rm.o.loadDeviceGroups().then(async(devGroups) => {
        this.devGroups = devGroups;
        return await this.buildHardwareAbstraction();
      });
    });
  }
  async buildHardwareAbstraction(deviceMap){
    const self = this;
    deviceMap = deviceMap || this.deviceMap;
    let rmcs = await Promise.all(deviceMap.nodes.map(async (node) => {
      const rmcId = node.rmc_id;
      let rmc = await self.loadMicroControlerTree(rmcId, true);
      self.eventHandler.emit('loadRmcTree', self.constructor.name, {rmId: self.rm.id, rmcId:rmcId});
      if(!rmc){
        return {};
      }
      if(!rmc.devGroup){
        self.eventHandler.emit('noDevGroup', self.constructor.name, {rmId: self.rm.id, rmcId:rmcId});
        return {};
      }
      if (rmc.mcs.length > 0){
        let mmcs = await Promise.all(rmc.mcs.map(async (mmcId)=>{
          let mmc = await self.loadMicroControlerTree(mmcId, true);
          self.eventHandler.emit('loadMmcTree', self.constructor.name, {rmId: self.rm.id, mmcId:mmcId});
          mmc.parent_mc_id = rmcId;
          return mmc;
        }));
        self.eventHandler.emit('rmcSubnetExist', self.constructor.name, {rmId: self.rm.id, rmcId:rmc.id});
        rmc.setSubnetwork(mmcs, false);
      } else if (rmc.devGroup.extended && rmc.devGroup.subgroups) {
          const subGroups = rmc.devGroup.subgroups;
          let mmcs = await Promise.all(Object.keys(subGroups).map(async (meshNodeId) => {
            let subNodeDevGroupCode = subGroups[meshNodeId];
            let subNodeDevGroup = this.devGroups.find(dg => dg.id === subNodeDevGroupCode);
            let params = {
              role: 'mmc',
              dev_group: subNodeDevGroupCode,
              active: true,
              subgroup:meshNodeId
            };
            return await this.createMeshMicroControlerTree(rmc, params);
          }));
          rmc.setSubnetwork(mmcs, true);
          this.eventHandler.emit('rmcSubnetCreated', self.constructor.name, {rmId: self.rm.id, rmcId:rmc.id});
        }
        rmc.dependencies = this.createDependenciesByDevGroup(rmc);
        rmc.save({id:rmc.id, dependencies: rmc.dependencies})
        self.eventHandler.emit('depsCreated', self.constructor.name, {rmId: self.rm.id, rmcId:rmc.id});
        self.tree[rmc.id] = rmc;
        return rmc;
    }));
    self.eventHandler.emit('controlerStore', self.constructor.name, {rmId: self.rm.id, controlers: self.controlers});
    return self.tree;
  }
  async loadMicroControlerTree(mcId, onlyActives) {
    const self = this;
    let mc = await MicroControler.load(mcId);
    if (onlyActives && !mc.active) {
      return mc;
    }
    this.controlers[mc.id] = mc;
    const ciId = mc.ci;
    let ci = await CommunicationInterface.load(ciId);
    ci.mcId = mc.id;
    mc.ci = ci;
    self.interfaces[ci.id] = ci;
    mc.devGroup = self.devGroups.find(devGroup => devGroup.id === mc.devGroup);
    if(mc.devs.length == 0 && mc.devGroup && mc.devGroup.devices){
      let devs = await self.createDevices(mc.devGroup, mcId);
      self.eventHandler.emit('mcDevicesCreated', self.constructor.name, {rmId: self.rm.id, mcId:mc.id});
      mc.setDevices(devs);
      await mc.save({id:mc.id, dev_ids: Object.keys(mc.devs)});
    } else if(mc.devs.length > 0){
      let devs = await self.loadDevices(mc.devs, mc.id);
      self.eventHandler.emit('mcDevicesExist', self.constructor.name, {rmId: self.rm.id, mcId:mc.id});
      mc.setDevices(devs);
    } else {
      self.eventHandler.emit('mcNoDevicesLoaded', self.constructor.name, {rmId: self.rm.id, mcId:mc.id});
    }
    return mc;
}
  async createMeshMicroControlerTree(rmc, params) {
    const self = this;
    let mmc = await MicroControler.generate(params);
    mmc.parent_mc_id = rmc.id;
    this.controlers[mmc.id] = mmc;
    const mmciId = rmc.ci.id + '_mesh_' + params.subgroup;
    const channel = params.subgroup.split('_')[0];
    const netId = params.subgroup.split('_')[1];
    let mci = await CommunicationInterface.generate({id: mmciId, protocol: 'rfm69', channel:channel, network_id:netId});
    mci.mcId = mmc.id;
    mmc.ci = mci;
    mmc.devGroup = self.devGroups.find(dg => dg.id === params.dev_group);
    self.eventHandler.emit('mcDevicesCreated', self.constructor.name, {rmId: self.rm.id, mcId:mmc.id});
    let devs = await self.createDevices(mmc.devGroup, mmc.id);
    mmc.setDevices(devs);
    await mmc.save({id:mmc.id, dev_ids: Object.keys(mmc.devs), ci_id: mmc.ci.id});
    return mmc;
  }
  async loadDevices(deviceIds, mcId) {
    const self = this;
    let devs = await Promise.all(deviceIds.map(async (devId) => {
      let tmpDev = await Device.load(devId);
      let specId = tmpDev.specification;
      let devSpecification = self.devSpecifications.find(s => s.id == specId);
      let dev = null;
      if (tmpDev.role === 'in') {
        dev = new Sensor(tmpDev.id, tmpDev.title, devSpecification, tmpDev.role, mcId, tmpDev.io);
      } else if (tmpDev.role === 'out') {
        dev = new Actuator(tmpDev.id, tmpDev.title, devSpecification, tmpDev.role, mcId, tmpDev.io);
      } else if (tmpDev.role === 'forward') {
        dev = new Device(tmpDev.id, tmpDev.title, devSpecification, tmpDev.role, mcId, tmpDev.io);
      }
      self.devices.push(dev);
      return dev;
    }));
    return devs;
  }
  async createDevices(devGroup, mcId) {
    const self = this;
    let devGroupDevices = Object.keys(devGroup.devices);
      let devs = await Promise.all(devGroupDevices.map(async (io) => {
        let type = devGroup.devices[io];
        let devSpecification = this.devSpecifications.find(s => s.type == type);
        let params = {title:type, specification_id:devSpecification.id, role:devSpecification.role, mc_id:mcId, io:io};
        let devClass = null;
        if (devSpecification.role === 'in') {
          devClass = Sensor;
        } else if (devSpecification.role === 'out') {
          devClass = Actuator;
        } else if (devSpecification.role === 'forward') {
          devClass = Device;
        }
        return await devClass.generate(params, devSpecification);
      }));
      return devs;
  }
  initializeControler(rmc) {
    rmc.ci.flushQueue();
    rmc.op.cis.enum.forEach((ed)=>{
      this.enqueueCommand('operation_profile', ed, rmc.ci);
    })

  }
  setAction(events, action) {
    const self = this;
    let cisHaveMessages = {};
    events.forEach((e)=>{
      let mcId = e.device.mcId;
      const rmc = self.getRootControler(mcId);
      let rci = rmc.ci;
      self.enqueueCommand('action', e, rci);
      cisHaveMessages[rci.id] = rci;
    })
    Object.keys(cisHaveMessages).forEach((ciid)=>{
      let ci = cisHaveMessages[ciid];
      let dClass = ci.dClass;
      const rmc = self.getRootControler(ci.mcId);
      if(dClass == 'C'){
        self.triggerCommand('action', ci, rmc);
      }
    })

  }
  async createMicroControlers(nodes, opInitCallback){
    const self = this;
    let mcs = await Promise.all(nodes.map(async (params) => {
      return await MicroControler.generate(params);
    }));
    let mcsOnTree = await self.setControlers(mcs, opInitCallback);
    return mcsOnTree;
  }
  async deleteMicroControlers(ids){
    const self = this;
    let mcs = self.getControlers(ids).filter(function(n) {
     return n !== undefined;
    });
    if(!mcs.length){
      return 'Nothing deleted cause not exist. No such controlers in memory.'
    }
    let deletedIds = await Promise.all(mcs.map(async (mc) => {
      return await self.deleteMicroControlerTree(mc);
    }));
    await self.unsetControlers(mcs);
    self.eventHandler.emit('mcsDeleted', self.constructor.name, {rmId: self.rm.id, deletedIds:deletedIds});
    return deletedIds.toString() + ' microcontrolers deleted.';
  }

  async deleteMicroControlerTree(mc){
    let deletedIds = [await mc.remove()];
    if(mc.mcs){
      deletedIds = deletedIds.concat(await Promise.all(Object.values(mc.mcs).map(async (mc) => {
        return await this.deleteMicroControlerTree(mc);
      })));
    }
    if(Object.values(mc.devs).length){
      let deletedDevsIds = await this.deleteDevices(Object.values(mc.devs));
      self.eventHandler.emit('devicesDeleted', self.constructor.name, {rmId: self.rm.id, deletedDevsIds:deletedDevsIds});
    }
    if(mc.op && mc.op.id){
      let deletedOpId = await mc.op.remove();
      self.eventHandler.emit('opDeleted', self.constructor.name, {rmId: self.rm.id, deletedOpId:deletedOpId});
    }
    return deletedIds;
  }

  async deleteDevices(devs){
    return await Promise.all(devs.map((d) => d.remove()));
  }
  createDependenciesByDevGroup(rmc){
    let devGroup = rmc.devGroup;
    let dependencies = {};
    let groupDependencies = devGroup.dependencies;
    if(!groupDependencies){
      return dependencies;
    }
    Object.keys(groupDependencies).forEach((outIo)=>{
      let inIos = groupDependencies[outIo];
      let outId = this.getDeviceIdbyIo(rmc, outIo);
      dependencies[outId] = inIos.map((inIo)=>{
        return this.getDeviceIdbyIo(rmc, inIo);
      })
    })
    return dependencies;
  }
  appendDependenciesByIds(dependencies, dependeeDeviceId, dependentDevicesIds){
    dependencies = dependencies || {};
    dependencies[dependeeDeviceId] = dependentDevicesIds;
    return dependencies;
  }
  getDevDependencies(dependencies, device_id) {
    let devIds = dependencies[device_id];
    return this.getDeviceObjects(devIds);
  }
  collectRecipeDependencies(recipe, mcs){
    const self = this;
    let dependencies = {};
    mcs = mcs || Object.values(this.controlers);
    recipe.models.forEach((m)=>{
      dependencies[m.id] = {};
      mcs.forEach((mc)=>{
        if(mc.dependencies){
          let filteredDeps = this.filterDependencies(mc.dependencies, m.outputs, m.inputs);
          dependencies[m.id][mc.id] = filteredDeps;
        }
      });
      this.eventHandler.emit('recipeDepsCollected', self.constructor.name, {rmId:self.rm.id, recipeId:recipe.id, mId: m.id, dependencies:dependencies});
    })
    return dependencies;
  }
  filterDependencies(dependencies, outTypes, inTypes) {
    let filteredDependencies = {};
    outTypes.forEach((outType) => {
      filteredDependencies[outType] = {};
      let outs = this.getDeviceObjects(Object.keys(dependencies), 'out', outType);
      if (outs.length > 0) {
        let outIds = this.getDeviceIds(outs);
        outIds.forEach((outId) => {
          filteredDependencies[outType][outId] = {};
          let outDeps = this.getDevDependencies(dependencies, outId);
          inTypes.forEach((inType) => {
            filteredDependencies[outType][outId][inType] = {};
            let ins = this.getDeviceObjects(outDeps, 'in', inType);
            if (ins.length > 0) {
              let inIds = this.getDeviceIds(ins);
              filteredDependencies[outType][outId][inType] = inIds;
            } else {
              delete filteredDependencies[outType][outId][inType];
            }
          })
        })
      }
    })
    return filteredDependencies;
  }

  getDevices(dids) {
    return this.devices.filter(d => dids.includes(d.id));
  }
  getDevice(device) {
    if(!device.id){
      return this.devices.find(d => d.id === device);
    }
    return device;
  }
  getDeviceObjects(devices, role, type) {
    devices = devices.map(dev => this.getDevice(dev));
    if(role){
      devices = devices.filter((d)=>{
        return d.role == role;
      })
    }
    if(type){
      devices = devices.filter((d)=>{
        let specs = this.config.specifications;
        const devType = Object.keys(specs).find(key => specs[key] == d.specification.type);
        return devType == type;
      })
    }
    return devices;
  }
  getMcDevices(mc, role, type) {
    return this.getDeviceObjects(mc.devs, role, type);
  }
  getMcSubDevices(mc, role, type) {
    let subDevices = [];
    let subMcs = (mc.mcs.length) ? mc.mcs.length : Object.values(mc.mcs);
    subMcs.forEach((mmc)=>{
      let mmcDevs = this.getDeviceObjects(mmc.devs, role, type);
      subDevices.concat(mmcDevs);
    })
    return subDevices;
  }
  getAllDevices(role, type) {
    return this.getDeviceObjects(this.devices, role, type);
  }
  getDeviceIds(devices){
    return devices.map((d => d.id))
  }

  getDeviceIdbyIo(rmc, io){

    if(io[0] === 'f'){
      let meshNodeId = io.substr(1);
      let mmc = Object.values(rmc.mcs).find(mmc => mmc.subgroup === meshNodeId);
      return Object.values(mmc.devs)[0].id;
    } else {
      return Object.values(rmc.devs).find(d => d.io === io.toString()).id;
    }
  }
  getControler(mcId) {
    let mc = this.controlers[mcId];
    return mc;
  }
  getRootControler(mcId) {

    const self = this;
    let rmcId = null;
    if(self.tree[mcId]){
      return self.tree[mcId];
    }
    else {
      let mc = this.controlers[mcId];
      return self.getControler(mc.parent_mc_id);
    }

  }

  getControlers(mcIds) {
    let mcs = mcIds.map(mcId => this.controlers[mcId]);
    return mcs;
  }

  getActiveRootControlers(mcs){
    if(mcs){
      return mcs.filter(mc => mc.role === 'rmc').filter(mc => mc.active == true);
    } else {
      return Object.values(this.controlers).filter(mc => mc.role === 'rmc').filter(mc => mc.active == true);
    }
  }

  async setControlers(mcs, opInitCallback){

    const self = this;
    let newDevMapNodes = mcs.map((mc) => {return {rmc_id:mc.id,mmc_ids:mc.mcs.map(mc=>mc.id)}});
    let tree = await self.buildHardwareAbstraction({nodes:newDevMapNodes});
    self.deviceMap.nodes = self.deviceMap.nodes.concat(newDevMapNodes);
    self.rm.o.updateDeviceMap(self.deviceMap.id, self.deviceMap.nodes);

    let initializedMcs = newDevMapNodes.map((node) => tree[node.rmc_id]);

    let mcsOnTree = initializedMcs.map(mc => {
      if(mc.active){
        return self.controlers[mc.id];
      } else {
        return mc;
      }
    });
    let activeRmcs = self.getActiveRootControlers(mcsOnTree);
    let rmcs = await opInitCallback.call(null, activeRmcs);
    console.log(rmcs.map(mc => mc.op.id))
    return rmcs;
  }

  async unsetControlers(mcs){
    console.log('TODO',' somehow the tree should be reloaded for this mc or its parent, dependencies? ops?');
    mcs.forEach((mc) => {
      let mcId = mc.id;
      this.deviceMap.nodes.splice(this.deviceMap.nodes.findIndex(n => n.rmc_id == mcId), 1);
      this.rm.o.updateDeviceMap(this.deviceMap.id, this.deviceMap.nodes);
      delete this.controlers[mcId];
      delete this.tree[mcId];
    })
    return await this.buildHardwareAbstraction();
  }






};
module.exports = DeviceControler;
