const express = require('express');

class APIRouter {
  constructor(app, orchestrator, requestHandler, eventHandler) {
    this.app = app;
    this.o = orchestrator;
    this.requestHandler = requestHandler;
    this.eventHandler = eventHandler;
    this.routes = {
        '/api/device-groups':[
          {param:'',fn:'dev_groups'}
        ],
        '/api/device-specifications':[
          {param:'',fn:'dev_specs'}
        ],
        '/api/operation-setup':[
          {param:'',fn:'op_setup'}
        ],
        '/api/system-configuration':[
          {param:'',fn:'sys_config'},
          {param:'/:cmd',fn:'sys_config'}
        ],
        '/api/read_rm':[
          {param:'',fn: 'read_rm'}
        ],
        '/api/read_points':[
          {param:'',fn: 'read_points'}
        ],
        '/api/read_mcs':[
          {param:'',fn: 'read_mcs'}
        ],
        '/api/read_cis':[
          {param:'',fn: 'read_cis'}
        ],
        '/api/read_devs':[
          {param:'',fn: 'read_devs'}
        ],
        '/api/read_ops':[
          {param:'',fn: 'read_ops'}
        ],
        '/api/read_events':[
          {param:'',fn: 'read_events'}
        ],
        '/api/read_devs_reports':[
          {param:'',fn: 'read_devs_reports'}
        ],
        '/api/read_devs_actions':[
          {param:'',fn: 'read_devs_actions'}
        ],
        '/api/read_cis_payloads':[
          {param:'',fn: 'read_cis_payloads'}
        ],
        '/api/create_rm':[
          {param:'',fn: 'create_rm'}
        ],
        '/api/create_points':[
          {param:'',fn: 'create_points'}
        ],
        '/api/create_mcs':[
          {param:'',fn: 'create_mcs'}
        ],
        '/api/create_actions':[
          {param:'',fn: 'create_actions'}
        ],
        '/api/update_points':[
          {param:'',fn: 'update_points'}
        ],
        '/api/delete_rm':[
          {param:'',fn: 'delete_rm'}
        ],
        '/api/delete_points':[
          {param:'',fn: 'delete_points'}
        ],
        '/api/delete_mcs':[
          {param:'',fn: 'delete_mcs'}
        ],
        '/api/read_user':[
          {param:'',fn: 'read_user'}
        ],
        '/api/rm_gen':[
          {param:'',fn: 'rm_gen'}
        ],
      }
  }
  initRoutes(){
    const self = this;
    Object.keys(self.routes).forEach((path)=>{
      let handlers = self.routes[path];
      self.createRoute(path, handlers);
    });
    self.eventHandler.emit('apiRoutReady', self.constructor.name, {routes:Object.keys(self.routes)});
  }
  createRoute(path, handlers){
    const self = this;
    const router = new express.Router();
    handlers.forEach((handler)=>{
      let fn = async function(request, response, next){

        try {
          let params = {};
          if(request.method === "GET"){
            params = request.params;
          }
          if(request.method === "POST"){
            params = request.body
          }
          self.eventHandler.emit('apiRequest', self.constructor.name, {method:request.method, params:params});
          if(handler.fn !== 'dev_groups' || handler.fn !== 'dev_specs' || handler.fn !== 'sys_config'){
            let data = await self.requestHandler.onHttpRequest(self.requestHandler.handlers[handler.fn])(request);
            if(data){
              return response.json(data);
            }
          }

          let {id, username, role, rm_ids} = request.user;
          let user = {id:id, username:username, role:role, rmIds:rm_ids};

          if(!user.rmIds.includes(params.rmId) && handler.fn !== 'rm_gen' && handler.fn !== 'create_rm'){
            self.eventHandler.emit('requestRmMismatch', self.constructor.name, {handler:handler, request:request});
            return response.json({
              error:{
                code: 1,
                message: 'User and resource manager identifier mismatching.'
              }
            });
          } else {
            let {data} = await self.requestHandler.onHttpRequest(self.requestHandler.handlers[handler.fn])(request, user);
            if(data){
              return response.json(data);
            }
          }
        } catch (err) {
          self.eventHandler.emit('apiRequestError', self.constructor.name, {error:err});
          return next(err);
        }
      }

      router.route(handler.param).get(fn);
      router.route('/').post(this.requestHandler.passport.authenticate(['jwt']), fn);
    })

    this.app.use(path, router);
  }

};
module.exports = APIRouter;
