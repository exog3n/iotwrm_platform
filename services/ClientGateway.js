
class ClientGateway {
  constructor(app, orchestrator, requestHandler, eventHandler) {
    this.app = app;
    this.o = orchestrator;
    this.requestHandler = requestHandler;
    this.eventHandler = eventHandler;
    this.connections = {};
    this.listeners = { 
      'read_rm': 'read_rm',
      'read_points': 'read_points',
      'read_mcs': 'read_mcs',
      'read_cis': 'read_cis',
      'read_devs': 'read_devs',
      'read_ops': 'read_ops',
      'read_events': 'read_events',
      'read_user': 'read_user',
      'read_devs_reports': 'read_devs_reports',
      'read_devs_actions': 'read_devs_actions',
      'read_cis_payloads': 'read_cis_payloads',
      'create_rm': 'create_rm',
      'create_points': 'create_points',
      'create_mcs': 'create_mcs',
      'create_actions': 'create_actions',
      'update_points': 'update_points',
      'delete_rm': 'delete_rm',
      'delete_points': 'delete_points',
      'delete_mcs': 'delete_mcs',

      'rm_gen': 'rm_gen',

      'mc_add': 'mc_data',
      'mcs_add': 'mc_data',
      'mc_data': 'mc_data',

      'mc_devs_data': 'devs_data',
      'devs_data': 'devs_data',
      'actions_add': 'event',
    }
  }
  listen(callbacks) {
    let self = this;
    const origins = ["http://lora.hmu.gr:5000","http://localhost:9000"];
    const io = require('socket.io')(self.app.server, {  cors: {
      origins: origins,
      }
    })
    const wrap = middleware => (socket, next) => middleware(socket.request, {}, next);
    io.use(wrap(this.requestHandler.passport.initialize()));
    io.use(wrap(this.requestHandler.passport.authenticate(['jwt'])));

    io.use((socket, next) => {
      if (socket.request.user) {
        self.eventHandler.emit('clientUserAuthenticated', self.constructor.name, {connection:socket.id, userId:socket.request.user.id});
        next();
      } else {
        self.eventHandler.emit('clientUserNonAuthenticated', self.constructor.name, {connection:socket.id});
        next(new Error('Unauthorized'))
      }
    });
    self.eventHandler.emit('socketGwListen', self.constructor.name, {origins:origins});

    io.sockets.on('connection', function(socket) {

      let {id, username, role, rm_ids} = socket.request.user;
      let user = {id:id, username:username, role:role, rmIds:rm_ids};
      self.connections[socket.id] = {
        socket: socket,
        user: user
      };

      self.emitMessage('session', {
        session:socket.id,
        user: user
      });
      Object.keys(self.listeners).forEach((handler)=>{
        socket.on(handler, async (request) => {
          self.eventHandler.emit('socketRequest', self.constructor.name, {handler:handler, request:request});
          if(!user.rmIds.includes(request.rmId) && handler !== 'rm_gen' && handler !== 'create_rm' && handler !== 'read_user' ){
            self.emitMessage(self.listeners[handler], {
              session: socket.id,
              error:{
                code: 1,
                message: 'User and resource manager identifier mismatching.'
              }
            });
            self.eventHandler.emit('requestRmMismatch', self.constructor.name, {handler:handler, request:request});
          } else {
            let {data} = await self.requestHandler.onWsRequest(callbacks[handler])(request, user);
            data.session = socket.id;
            if(request.rmId){
              self.connections[socket.id].rmId = request.rmId;
            }
            self.emitMessage(self.listeners[handler], data);
          }
        })
      })

      self.eventHandler.emit('clientConnect', self.constructor.name, {connection:socket.id, user:user.username});

      socket.on('disconnect', () => {
        delete self.connections[socket.id];
        self.eventHandler.emit('clientDisconnect', self.constructor.name, {connection:socket.id, user:user.username});
      });
    });
    return true;
  }
  emitMessage (type, data, rmId){
    const self = this;
    if(rmId){
      let sessions = Object.values(this.connections).filter((session)=>session.rmId == rmId); // find the sessions that associated with the rm
      sessions.forEach((session)=>{
        session.socket.emit(type, data);
        self.eventHandler.emit('socketResponse', self.constructor.name, {rmId: rmId, sessionId: session.socket.id, handler:type, response:data});
      });
    } else if (data.session){
      this.connections[data.session].socket.emit(type, data);
      self.eventHandler.emit('socketResponse', self.constructor.name, {sessionId: this.connections[data.session].socket.id, handler:type, response:data});
    } else {
      self.eventHandler.emit('socketCannotEmit', self.constructor.name, {handler:type, response:data});
    }
  }

  updateNotification(rmId, data){
    let self = this;
    self.emitMessage('update_data', data, rmId);
    self.eventHandler.emit('clientUpdate', self.constructor.name, {rmId:rmId, data:data});
  }



};
module.exports = ClientGateway;
