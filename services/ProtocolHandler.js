
const BitPacker = require('./BitPacker');
class ProtocolHandler extends BitPacker{
  constructor(settings, env, eventHandler) {
    super(settings, eventHandler);
    this.env = env;
  }


  encodeMessage(cmd, data, op){ 
    const self = this;
    self.eventHandler.emit('protocolEncode', self.constructor.name, {cmd:cmd, data:data, op:op});
    let message = {};
    if(this.settings.payloadType === 'binary'){
      let dataMap = null;
      let buffer = null;
      if(cmd == 'init'){
        dataMap = {
          cmd: this.settings.flags[cmd],
          dev_code: data.deviceGroupCode || this.settings.edge.defaultDevGroup
        }
      }
      else if(cmd == 'operation_profile'){
        dataMap = {
          cmd: this.settings.flags[cmd],
          is_part: (data.isPart) ? 1 : 0,
          header:{},
          devices:data.devices.map(id => {
            let dev = op.devs[id];
            let map = {};
            map.value_type = this.settings.flags[data.type];
            if(dev.io && !dev.netId){
              if(/[a-zA-Z]/i.test(dev.io)){
                map.op_io_type = 'port';
                map.op_io_port = dev.io;
              }else if(/[0-9]/i.test(dev.io)){
                map.op_io_type = 'gpio';
                map.op_io_gpio = dev.io;
              }
              if(dev.in){
                map.value = Object.values(dev.in).join(';');
              } else if(dev.out){
                map.value = Object.values(dev.out).join(';');
              } else if(dev.forward){
                map.value = Object.values(dev.forward).join(';');
              }
            } else if (dev.netId){
              map.op_io_type = 'subnetwork';
              map.op_subnetwork_network_id = dev.channel;
              map.op_subnetwork_node_id = dev.netId;
              map.op_subnetwork_device_id = dev.io;
              map.value = '1';
            }
            return map;
          })
        }
      }
      else if(cmd == 'action'){
        dataMap = {
          cmd: this.settings.flags[cmd],
          is_part: (data.isPart) ? 1 : 0,
          header:{
            epoch: this.encodeEpoch(data.timestamp)
          },
          devices:data.events.map(e => {
            let val = {};
            val[e.timestamp] = (e.value === 'on') ? 1 : 0;
            return {
              device_index:op.cis.enum.indexOf(e.device.id),
              value_type: this.settings.flags[data.type],
              value : val
            }
          })
        }
      }
      else if(cmd == 'continue'){
        dataMap = {
          cmd: this.settings.flags[cmd],
        }
      }
      else {
        self.eventHandler.emit('binaryEncodingFailed', self.constructor.name, {});
      }
      if(dataMap){
        let messageData = this.preprocessMessageData(dataMap, this.settings.binaryChunkSchemes);
        self.eventHandler.emit('binaryPreprocessed', self.constructor.name, {dataMap:dataMap, messageData:messageData});
        message.binary = this.encodeProtocolMessageToBuffer(messageData, this.settings.binaryChunkSchemes);
      }
    }
    if(this.settings.payloadType === 'text'){
      if(cmd == 'init'){
        let dg = data.deviceGroupCode || this.settings.edge.defaultDevGroup;
        message.text = this.settings.flags[cmd] + dg;
      }
      else if(cmd == 'operation_profile'){
        message.text = this.settings.flags[cmd] + this.encodeOperationProfile(data, op);
      }
      else if(cmd == 'action'){
        message.text = this.settings.flags[cmd] + this.encodeActions(data, op);
      }
      else if(cmd == 'continue'){
        message.text = this.settings.flags[cmd];
      }
      else {
        self.eventHandler.emit('textEncodingFailed', self.constructor.name, {});
      }
    }
    self.eventHandler.emit('messageEncoded', self.constructor.name, {encodedData:message});
    return message;
  }
  encodePart(cmd, data, dev){
    const self = this;
    let message = {};
    if(this.settings.payloadType === 'binary'){
      let dataMap = null;
      let buffer = null;
      if(cmd == 'report'){
        if(data.cmd){
          dataMap = {
            cmd: this.settings.flags[data.cmd],
            is_part: (data.isPart) ? 1 : 0,
            header:{
              epoch: this.encodeEpoch(data.timestamp)
            }
          }
        } else {
          let val = {};
          val[Object.keys(data)[0]] = Object.values(data)[0];
          dataMap = {
            cmd: this.settings.flags[cmd],
            is_part: (data.isPart) ? 1 : 0,
            epoch: dev.syncEpoch,
            devices:[
              {
                device_index:dev.index,
                value_type: (dev.role == 'in') ? 'm' : 'e',
                value :val
              }
            ]
          }
        }
      }
      else {
        self.eventHandler.emit('binaryEncodingFailed', self.constructor.name, {});
      }
      if(dataMap){
        message.binary = this.encodeProtocolMessageToBuffer(this.preprocessMessageData(dataMap, this.settings.binaryChunkSchemes), this.settings.binaryChunkSchemes);
      }
    }
    if(this.settings.payloadType === 'text'){
      if(cmd == 'report'){
        message.text = this.encodeDeviceReport(data, dev, this.settings.flags.standard_block_separator);
      }
      else {
        self.eventHandler.emit('textEncodingFailed', self.constructor.name, {});
      }
    }
    self.eventHandler.emit('messageEncoded', self.constructor.name, {encodedData:message});
    return message;
  }

  encodeEpoch(timestamp){
    return (timestamp) ? Math.round(timestamp / 1000) : '';
  }

  encodeOperationProfile(data, op){
    const self = this;
    let {devices, type, enumMethod, isPart} = data;
    let msgBlocks = [];
    let rootDeviceBlock = [];
    let batchDeviceBlock = [];
    let filteredDevices = op.cis.enum.filter(rd => devices.indexOf(rd) != -1);
    filteredDevices.filter(rd => op.subnetworks.enum.indexOf(rd) == -1).forEach((did)=>{
      let dev = op.devs[did];
      let valueMap = {};
      if(dev.in){
        valueMap = dev.in
      } else if(dev.out){
        valueMap = dev.out
      } else if(dev.forward){
        valueMap = dev.forward
      }
      let values = Object.values(valueMap);
      let valueBlock = self.buildValueBlock(values, self.settings.flags['instruction']);
      if(dev.io){
        let routeBlock = [dev.io];
        valueBlock = routeBlock.concat(valueBlock);
      }
      batchDeviceBlock = batchDeviceBlock.concat(['_'], valueBlock);
    })
    rootDeviceBlock = rootDeviceBlock.concat(batchDeviceBlock);
    msgBlocks = msgBlocks.concat(rootDeviceBlock);
    if(op.subnetworks.enum.length){
      let filteredSubDevices = op.subnetworks.enum.filter(rd => devices.indexOf(rd) != -1);
      if(filteredSubDevices.length > 0){
        let forwardMessageBlock = [self.settings.flags['forward']];
        for(let i = 0; i < filteredSubDevices.length ; i++){
          let mdevId = filteredSubDevices[i]
          let mdev = op.subnetworks.devs[mdevId];
          let singleDeviceBlock = [self.settings.flags['single']];
          let deviceIndex = i;
          let routeBlock = self.buildRouteBlock([mdev.channel,mdev.netId]);
          singleDeviceBlock = singleDeviceBlock.concat(routeBlock);
          let valueMap = {};
          if(mdev.in){
            valueMap = mdev.in
          } else if(mdev.out){
            valueMap = mdev.out
          }
          let valueBlock = self.buildValueBlock(Object.values(valueMap), self.settings.flags['instruction']);
          singleDeviceBlock = singleDeviceBlock.concat(valueBlock);
          forwardMessageBlock = forwardMessageBlock.concat(singleDeviceBlock);
        }
        msgBlocks = msgBlocks.concat(forwardMessageBlock);
      }
    }
    if(isPart){
      msgBlocks.push(self.settings.flags['continue'])
    }
    return msgBlocks.join('');
  }
  encodeDeviceReport(data, dev, separator){
    let msgType = null;
    if(dev.role == 'in'){
      msgType = 'measurement';
    } else if (dev.role == 'out'){
      msgType = 'event';
    }
    if(dev.index < 0){
      self.eventHandler.emit('noDevIndex', self.constructor.name, {devId:dev.id});
    }
    let routeBlock = dev.index;
    let time = Object.keys(data)[0];
    let value = Object.values(data)[0];
    let valueBlock = this.settings.flags[msgType] + value;
    let timeBlock = this.settings.flags['date'] + this.buildTimeBlock(dev.syncEpoch, time);
    return separator + routeBlock + valueBlock + timeBlock;
  }

  encodeActions(data, op){
    const self = this;
    let {events, type, enumMethod, isPart, timestamp} = data;
    let msgBlocks = [];
    events.forEach((n)=>{
      let deviceBlock = [];
      let dev = n.device;
      console.log('device',dev)
      console.log('data',data)
      let eventValue = self.settings.flags[n.value];
      let actionType = self.settings.flags[type];
      let deviceIndex = data.index || op.cis.enum.indexOf(dev.id);
      let routeBlock = self.buildRouteBlock([deviceIndex]);
      deviceBlock = deviceBlock.concat([self.settings.flags['single']],routeBlock);
      if(dev.in){
        console.error('Not allowed action');
      }
      let valueBlock = self.buildValueBlock([eventValue], actionType);
      deviceBlock = deviceBlock.concat(valueBlock); // e.g. s10t1s11t0
      let timeBlock = self.buildTimeBlock(timestamp, n.timestamp);
      deviceBlock = deviceBlock.concat([self.settings.flags['date']],timeBlock);
      msgBlocks = msgBlocks.concat(deviceBlock);
    })
    if(isPart){
      msgBlocks.push(self.settings.flags.continue)
    }
    if(timestamp){
      msgBlocks.unshift(self.buildTimeBlock(timestamp));
    }
    return msgBlocks.join('');
  }


  decode(message, op){
    const self = this;
    self.eventHandler.emit('protocolDecode', self.constructor.name, {message:message, op:op});
    if(self.settings.payloadType === 'binary'){
      let decodedMsg = this.decodeProtocolMessageFromBuffer(message, self.settings.binaryChunkSchemes);
      let commandStr = Object.keys(self.settings.flags).find(fl => this.settings.flags[fl] === decodedMsg.cmd);
      let isPart = (decodedMsg.results.is_part == 1) ? true : false;
      self.eventHandler.emit('messageDecoded', self.constructor.name, {decodedMsg:decodedMsg});
      if(self.env === 'cloud'){
        decodedMsg.data.forEach(d => {
          d[0] = op.cis.enum[d[0]]
        })
      }
      return {blocks:decodedMsg.data, cmd:commandStr, isPart:isPart};
    }
    if(self.settings.payloadType === 'text'){
      let blocks = [];
      let isPart = false;
      let msgParts = [];
      let cmd = message[0];
      let commandStr = Object.keys(self.settings.flags).find(fl => this.settings.flags[fl] === cmd);
      if(cmd){
        if(cmd == this.settings.flags['init']){
            return {blocks:[[null, message.substr(1)]], cmd:commandStr, isPart:false}
        }
        if(cmd == this.settings.flags['ping']){
            return {blocks: [[op.mcId,cmd]], cmd:commandStr, isPart:false}
        }
      } else {
        self.eventHandler.emit('textFlagMissing', self.constructor.name, {});
        return -1;
      }
      message = message.substr(1);
      if(message.length == 0){
        self.eventHandler.emit('textFlagOnly', self.constructor.name, {message:message});
        return {blocks:blocks, cmd:commandStr , isPart:isPart};
      }
      isPart = message[message.length - 1] == this.settings.flags['continue'];
      if(isPart){
        self.eventHandler.emit('textIsPart', self.constructor.name, {message:message});
        message = message.slice(0, -1);
      }
      if(message[0] == this.settings.flags['forward']){
        message = message.substr(1);
        blocks = blocks.concat(this.decodeParts(cmd, message ,this.settings.flags.single_block_separator));
      } else {
        msgParts = message.split(this.settings.flags['forward']).filter(Boolean);
        let separator = (cmd == this.settings.flags['action']) ? this.settings.flags.single_block_separator : this.settings.flags.standard_block_separator;
        blocks = blocks.concat(this.decodeParts(cmd, msgParts[0] ,separator));
        if(msgParts[1]){
          blocks = blocks.concat(this.decodeParts(cmd, msgParts[1] ,this.settings.flags.single_block_separator));
        }
      }
      self.eventHandler.emit('messageDecoded', self.constructor.name, {decodedMsg:blocks});
      if(self.env === 'cloud'){
        blocks.forEach(d => {
          d[0] = op.cis.enum[d[0]]
        })
      }
      return {blocks:blocks, cmd:commandStr , isPart:isPart};
    }
  }

  decodeParts(cmd, message, separator){
    let blocks = [];
    let parts = message.split(separator).filter(Boolean);
    let epoch = null;
    if(parts[0].length == 10){
      epoch = parts[0];
      parts.shift();
    }
    for (let i = 0; i < parts.length; i++) {
      let part = parts[i];
      let deviceBlock = this.decodeDeviceBlock(part, cmd, epoch);
      if(deviceBlock){
        blocks.push(deviceBlock);
      }
    }
    return blocks;
  }

  decodeDeviceBlock(part, cmd, epoch){
    let contents = [];
    let routeBlock, valueBlock = [];
    if(cmd==this.settings.flags['action']){
      contents = part.split(this.settings.flags['trigger']);
      routeBlock = contents[0];
      if(contents[1].includes(this.settings.flags['date'])){
        let subContents = contents[1].split(this.settings.flags['date']);
        valueBlock[0] = subContents[0];
        valueBlock[1] = this.decodeTime(epoch, subContents[1]);
      } else {
        valueBlock = contents.slice(1);
      }
    }
    if(cmd==this.settings.flags['operation_profile']){
      if (part.includes(this.settings.flags['instruction'])) {
        contents = part.split(this.settings.flags['instruction']);
        routeBlock = contents[0];
        valueBlock = contents.slice(1);
      } else {
        routeBlock = part;
      }
    }
    if(cmd==this.settings.flags['report']){
      let reportFlags = this.settings.flags['measurement'] + this.settings.flags['event'];
      contents = part.split(part.match(new RegExp("([\d.]+)?[" + reportFlags + "]","g"))[0]);
      routeBlock = contents[0];
      if(contents[1].includes(this.settings.flags['date'])){
        let subContents = contents[1].split(this.settings.flags['date']);
        valueBlock[0] = subContents[0];
        valueBlock[1] = this.decodeTime(epoch, subContents[1]);
      } else {
        valueBlock = contents.slice(1);
      }
    }
    return [routeBlock,valueBlock];
  }

  decodeTime(epochSecondsTime, diffMinutesTime){
    if(diffMinutesTime){
      let diffSecondsTime = Number(diffMinutesTime) * 60;
      let toSecondsTime = Number(epochSecondsTime) + diffSecondsTime;
      return toSecondsTime * 1000;
    }
    return Number(epochSecondsTime) * 1000;
  }

  buildValueBlock(values, flag){
    let block = [];
    for (let i = 0 ; i < values.length ; i++){
      if(flag){
        block.push(flag);
      }
      block.push(values[i]);
    }
    return block;
  }

  buildRouteBlock(ids){
    let block = [];
    for (let i = 0 ; i < ids.length ; i++){
      block.push(ids[i]);
      if(i < ids.length - 1){
        block.push('_');
      }
    }
    return block;
  }

  buildTimeBlock(epochTime, toTime){
    let epochSecondsTime = Math.round(epochTime / 1000);
    if(toTime){
      let toSecondsTime = Math.round(toTime / 1000);
      let diffSecondsTime = toSecondsTime - epochSecondsTime;
      let diffMinutesTime = Math.round(diffSecondsTime / 60);
      return diffMinutesTime;
    }
    return epochSecondsTime;
  }

};
module.exports = ProtocolHandler;
