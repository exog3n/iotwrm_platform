const Downlink = require('../classes/downlink.class');
const Uplink = require('../classes/uplink.class');
const Join = require('../classes/join.class');
const CommunicationInterface = require('../classes/communicationInterface.class');
const ProtocolMessage = require('../classes/protocolMessage.class');
const ProtocolHandler = require('./ProtocolHandler');
const http = require('http');
class IORouter {
  constructor(rm, eventHandler) {
    this.rm = rm;
    this.interfaces = {};
    this.protocolHandler = new ProtocolHandler(rm.systemConfig.communication.protocol, 'cloud', eventHandler);
    this.eventHandler = eventHandler;
  }
  enqueueCommand(cmd, item, rci){
    const self = this;
    let queue = rci.q;
    if(cmd=='action'){
      let j = 0;
      while ( j < rci.q.length && rci.q[j].timestamp < item.timestamp ) {j ++};
      queue.splice(j, 0, item);
    } else if (cmd=='operation_profile'){
      queue.push(item);
    }
    rci.q = queue;
    self.eventHandler.emit('cmdEnqueued', self.constructor.name, {rmId: self.rm.id, cmd:cmd, rciId:rci.id, item:item});
    return queue;
  }
  triggerCommand(cmd, ci, rmc){
    const self = this;
    rmc = rmc || self.getControler(ci.mcId);
    let cmdsPerMsgLimit = 999; 
    if(self.protocolHandler.settings.payloadType === "text"){
      cmdsPerMsgLimit = 6;
    }
    else if(self.protocolHandler.settings.payloadType === "binary"){
      cmdsPerMsgLimit = 6;
    }
    if(ci.hasQueue()){
      this.eventHandler.emit('ciHasQueue', self.constructor.name, {rmId: self.rm.id, ciId: ci.id, q:ci.q});
      let fromTime, toTime = null;
      if(cmd == 'action'){
        fromTime = new Date();
        fromTime.setHours(0, 0, 0, 0);
        toTime = new Date();
        toTime.setDate(toTime.getDate() + 1);
        toTime.setHours(23, 59, 59, 999);
        fromTime = fromTime.getTime();
        toTime = toTime.getTime();
      }
      let items = ci.queueShift(cmdsPerMsgLimit, fromTime, toTime);
      if(items.length > 0){
        this.eventHandler.emit('ciQueueShift', self.constructor.name, {rmId: self.rm.id, ciId: ci.id, qLength:ci.q.length, items:items});
        let isPart = (cmdsPerMsgLimit - items.length) == 0 && ci.q.length > 0;
        self.routeCommand(cmd, items, rmc, isPart);
      } else {
        this.eventHandler.emit('ciQueueTimeFault', self.constructor.name, {rmId: self.rm.id, ciId: ci.id, q:ci.q});
      }
    }
  }
  routeCommand(cmd, items, rmc, isPart) {
    const self= this;
    let timestamp = Date.now();
    let message = {};
    self.eventHandler.emit('cmdsRouting', self.constructor.name, {rmId: self.rm.id, rmcId: rmc.id, cmd:cmd, items:items.map(i => i.id)});
    if (cmd == 'operation_profile') {
        let data = {devices: items, type:'instruction', enumMethod: 'single', isPart: isPart};
        message = this.protocolHandler.encodeMessage(cmd, data, rmc.op);
    } else if (cmd == 'action') {
        let data = {events: items, type:'trigger', enumMethod: 'single', isPart: isPart, timestamp:timestamp};
        message = this.protocolHandler.encodeMessage(cmd, data, rmc.op);
    }
    self.eventHandler.emit('msgToRoute', self.constructor.name, {rmId: self.rm.id, rmcId: rmc.id, cmd:cmd, message:message});
    this.createDownlink({peer:rmc.ci, data: message}, this.sendDownlink, timestamp);
  }
  async createDownlink(message, sendCallback, timestamp){
    let peer = message.peer;
    let id = peer.id + '_' + timestamp;
    let params = {id:id, message: message.data, timestamp:timestamp, ci:peer, type:'downlink'};
    let downlink = await Downlink.generate(params);
    sendCallback.call(this, downlink);
  }
  sendDownlink(downlink, forceDownlink) {
    const self= this;
    if(this.protocolHandler.settings.payloadType === 'binary' && downlink.message.binary){
      downlink.message = downlink.message.binary.toString('base64');
    } else if(this.protocolHandler.settings.payloadType === 'text' && downlink.message.text){
      downlink.message = Buffer.from(downlink.message.text).toString('base64');
    }
    let payload = forceDownlink || {
      appId: this.rm.networkId,
      devId: downlink.ci.id,
      frmPayload: downlink.message
    };
    self.eventHandler.emit('downlinkRouted', self.constructor.name, {rmId: self.rm.id, ciId:payload.devId, downlinkId: downlink.id, payload:payload});
    let url = "/api/v3/as/applications/"+payload.appId+"/webhooks/payloads/devices/"+payload.devId+"/down/push";
    let data = '{"downlinks":[{"frm_payload":"'+ payload.frmPayload +'","f_port":41,"priority":"NORMAL"}]}';
    const options = {
        hostname: this.config.communication.ttsIp,
        port:1885,
        path: url,
        method: 'POST',
        headers: {
          'Authorization': this.config.communication.ttsBearer,
        }
    };
    const req = http.request(options, (res) => {
        res.on('data', (chunk) => {
            console.log(`BODY: ${chunk}`);
        });
        res.on('end', () => {
        });
    });
    req.on('error', (e) => {
        console.error(`problem with request: ${e.message}`);
    });
    req.write(data);
    req.end();
  }
  async gatherUplink(id, raw, b64, time, ci, info) {
    const self = this;
    let rmc = self.getRootControler(ci.mcId);
    let uplinkData = null;
    if(self.protocolHandler.settings.payloadType === 'binary'){
      let buffer = Buffer.from(b64, 'base64');
      uplinkData = self.protocolHandler.decode(buffer, rmc.op);
      self.eventHandler.emit('binBufferGathered', self.constructor.name, {rmId: self.rm.id, ciId:ci.id, b64:b64, buffer: buffer, uplinkData:uplinkData});
    } else if(self.protocolHandler.settings.payloadType === 'text'){
      uplinkData = self.protocolHandler.decode(raw, rmc.op);
      self.eventHandler.emit('rawTextGathered', self.constructor.name, {rmId: self.rm.id, ciId:ci.id, raw:raw, uplinkData:uplinkData});
    }
    let params = {
      id:id,
      message: raw,
      timestamp:time,
      ci:ci,
      data:uplinkData.blocks,
      command: uplinkData.cmd,
      type:'uplink',
      f_cnt :info.f_cnt,
      f_port :info.f_port,
      frm_payload :info.frm_payload,
      gw_id :info.gw_id,
      rssi :info.rssi,
      snr :info.snr,
      channel_index :info.channel_index,
      channel_rssi :info.channel_rssi,
      spreading_factor :info.spreading_factor,
      bandwidth :info.bandwidth,
      data_rate_index :info.data_rate_index,
      coding_rate :info.coding_rate,
      frequency :info.frequency,
      toa :info.toa
    };
    let uplink = await Uplink.generate(params);
    self.eventHandler.emit('uplinkGathered', self.constructor.name, {rmId: self.rm.id, ciId:ci.id, uplinkId: uplink.id});
    return uplink;
  }

  async gatherJoin(id, time, ci, info) {
    const self = this;
    let rmc = self.getRootControler(ci.mcId);
    let params = {
      id:id,
      timestamp:time,
      ci:ci,
      type:'join'
    }
    let join = await Join.generate(params);
    self.eventHandler.emit('uplinkGathered', self.constructor.name, {rmId: self.rm.id, ciId:ci.id, joinId: join.id});
    return join;
  }

  getInterfaces(ciIds) {
    let ifaces = ciIds.map(ciId => this.interfaces[ciId]);
    return ifaces;
  }

};
module.exports = IORouter;
