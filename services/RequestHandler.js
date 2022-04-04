const { APIError, parseSkipLimit } = require('../helpers');
const Measurement = require('../classes/measurement.class');
const { deviceGroupsHandler, deviceSpecificationsHandler} = require('../handlers');
const { readDeviceGroups } = deviceGroupsHandler;
const { readDeviceSpecifications } = deviceSpecificationsHandler;
const { DeviceGroupModel } = require('../models');

const passport = require('passport');
const JWTStrategy = require('passport-jwt').Strategy;
const ExtractJWT = require('passport-jwt').ExtractJwt;

class RequestHandler {
  constructor(app, orchestrator, userManager, eventHandler) {
    this.app = app;
    this.o = orchestrator;
    this.userManager = userManager;
    this.eventHandler = eventHandler;
    this.passport = passport;
    this.passport.use(new JWTStrategy({
        jwtFromRequest: ExtractJWT.fromAuthHeaderAsBearerToken(),
        jsonWebTokenOptions: {
            ignoreExpiration: false,
        },
        secretOrKey: this.userManager.secret,
        algorithms: ['HS256'],
    }, async (jwtPayload, done) => {
        try {
          const user = await this.userManager.loadUser(jwtPayload.id);
          if (!user) {
              return done(null, false);
          }
          return done(null, user);
        } catch (error) {
            return (error, false);
        }
    }));

  }
  initHandlers(){
    const self = this;
    const orchestrator = self.o;
    self.handlers = { 
      read_rm: orchestrator.readResourceManager,
      read_points: orchestrator.readPoints,
      read_mcs: orchestrator.readMicroControlers,
      read_cis: orchestrator.readCommunicationInterfaces,
      read_devs: orchestrator.readDevices,
      read_ops: orchestrator.readOperationProfiles,
      read_events: orchestrator.readEvents,
      read_devs_reports: orchestrator.readDevicesReports,
      read_devs_actions: orchestrator.readDevicesActions,
      read_cis_payloads: orchestrator.readComInterfacePayloads,

      create_rm: orchestrator.createNewResourceManager,
      create_points: orchestrator.createNewPoints,
      create_mcs: orchestrator.createNewMicrocontrolers,
      create_actions: orchestrator.createNewActions,

      update_points: orchestrator.updateExistingPoints,


      delete_rm: orchestrator.deleteExistingResourceManager,
      delete_points: orchestrator.deleteExistingPoints,
      delete_mcs: orchestrator.deleteExistingMicrocontrolers,

      read_user: orchestrator.readUser,
      rm_gen: orchestrator.generateResourceManagerOptions,


      rm_data: orchestrator.readResourceManager,
      dev_groups: orchestrator.loadDeviceGroups,
      dev_specs: orchestrator.loadDeviceSpecifications,
      payloads: orchestrator.loadPayloads,
      op_setup: orchestrator.loadOperationSetup,
      sys_config: orchestrator.loadSystemConfiguration,
    }
    self.eventHandler.emit('reqHandlReady', self.constructor.name, {handlers:Object.keys(self.handlers)});
    return self.handlers;
  }

  onHttpRequest(fn){
    const self = this;
    return async function (request, user) {
      let params = {};
      if(request.method === "GET"){
        params = request.params;
      }
      if(request.method === "POST"){
        params = request.body
      }
      return await fn.call(self.o, params, user);
  }}
  onWsRequest(fn){
    const self = this;
    return async function (request, user){
      return await fn.call(self.o, request, user)
    }
  }

};
module.exports = RequestHandler;
