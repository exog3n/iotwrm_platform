
class NetworkGateway {
  constructor(app, eventHandler) {
    this.app = app;
    this.eventHandler = eventHandler;
    this.webhooks = {};
  }
  listen(orchestrator, systemCallback) {
    const self = this;
    const bodyParser = require("body-parser")
    self.app.use(bodyParser.json())
    this.eventHandler.emit('TTSGwListen', self.constructor.name, {});
    self.app.post("/uplinks", (req, res) => {
      this.eventHandler.emit('uplinkReceived', self.constructor.name, {ciId:req.body.end_device_ids.device_id});
      try{systemCallback.apply(orchestrator,[req.body,'uplink']);}catch(e){console.log(e)}
    });
    self.app.post("/joins", (req, res) => {
      this.eventHandler.emit('joinReceived', self.constructor.name, {ciId:req.body.end_device_ids.device_id});
      try{systemCallback.apply(orchestrator,[req.body,'join']);}catch(e){console.log(e)}
    });
    self.app.post("/downlinks/sent", (req, res) => {
      this.eventHandler.emit('downlinkSent', self.constructor.name, {ciId:req.body.end_device_ids.device_id});
    });
    self.app.post("/downlinks/queue", (req, res) => {
      this.eventHandler.emit('downlinkQueued', self.constructor.name, {ciId:req.body.end_device_ids.device_id});
    });
    self.app.post("/downlinks/join", (req, res) => {
      this.eventHandler.emit('downlinkJoin', self.constructor.name, {ciId:req.body.end_device_ids.device_id});
    });
  }

};
module.exports = NetworkGateway;
