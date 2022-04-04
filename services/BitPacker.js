let bitwise = require('bitwise');
let fs = require('fs');
const util = require('util')

class BitPacker {
  constructor(settings, eventHandler) {
    this.settings = settings || {}; 
    this.eventHandler = eventHandler;
  }

  preprocessMessageData(data, chunksSchemes) {
    const self = this;
    let cmd = chunksSchemes.cmd.value.indexOf(chunksSchemes.cmd.value.find(c => data.cmd == c));
    let command = chunksSchemes.cmd.value[cmd];
    if (command == 'r' || command == 'a' || command == 'o') {
      let messageChunks = [];
      let epoch = null;
      if (data.header){
        messageChunks.push(self.preprocessHeaderChunks(cmd, data));
        if(command != 'o'){
          epoch = data.header.epoch;
        }
      } else if(command != 'o') {
        epoch = data.epoch;
      }
      if (data.devices && data.devices.length == 1){
        messageChunks.push(self.preprocessDeviceChunks(data.devices[0], epoch, chunksSchemes));
        return self.mergeData(messageChunks);
      } else if (data.devices){
        messageChunks.push(self.mergeData(data.devices.map(d => self.preprocessDeviceChunks(d, epoch, chunksSchemes))));
      }
      return self.mergeData(messageChunks);
    }
    if (command == '0') {
      return self.preprocessInitChunks(cmd, data, chunksSchemes);
    }
    if (command == 'c'){
      return self.preprocessContinueChunks(cmd, data, chunksSchemes);
    }
  }

  preprocessInitChunks(cmd, data, chunksSchemes) {
    const self = this;
    let chunks = [];
    chunks.push({
      cmd: cmd
    });
    chunks.push({
      dev_code: chunksSchemes.dev_code.value.indexOf(chunksSchemes.dev_code.value.find(c => data.dev_code == c))
    });
    return chunks;
  }

  preprocessContinueChunks(cmd, data, chunksSchemes) {
    const self = this;
    let chunks = [];
    chunks.push({
      cmd: cmd
    });
    return chunks;
  }

  preprocessHeaderChunks(cmd, data) {
    const self = this;
    let chunks = [];

    chunks.push({
      cmd: cmd
    });
    chunks.push({
      is_part: data.is_part
    });
    if (data.header.epoch) {
      chunks.push({
        epoch: data.header.epoch
      }); // storing
    }
    //   });
    //   });
    //   });
    return chunks;
  }
  preprocessDeviceChunks(data, epoch, chunksSchemes) {
    const self = this;
    let chunks = [];
    if (typeof data.device_index !== 'undefined') {
      chunks.push({
        device_index: data.device_index
      });
    }
    if (typeof data.op_io_type !== 'undefined') {
      chunks.push({
        op_io_type: chunksSchemes.op_io_type.value.indexOf(chunksSchemes.op_io_type.value.find(c => data.op_io_type == c))
      });
    }
    if (typeof data.op_io_gpio !== 'undefined') {
      chunks.push({
        op_io_gpio: data.op_io_gpio
      });
    }
    if (typeof data.op_io_port !== 'undefined') {
      chunks.push({
        op_io_port: chunksSchemes.op_io_port.value.indexOf(chunksSchemes.op_io_port.value.find(c => data.op_io_port == c))
      });
    }
    if (typeof data.op_subnetwork_network_id !== 'undefined' && typeof data.op_subnetwork_node_id !== 'undefined') {
      chunks.push({
        op_subnetwork_network_id: data.op_subnetwork_network_id
      });
      chunks.push({
        op_subnetwork_node_id: data.op_subnetwork_node_id
      });
      // });
    }
    chunks.push({
      value_type: chunksSchemes.value_type.value.indexOf(data.value_type)
    });

    let values = null;
    if (!data.value) {
      values = [''];
    }
    else if (data.value.split) {
      values = data.value.split(";");
    } else {
      values = Object.values(data.value)[0].toString().split(";");
    }

    chunks.push({
      value_subvalues_number: values.length
    });

    if (epoch) {
      let timeDiff = self.calculateTimeDiff(epoch, Object.keys(data.value)[0]);
      if (timeDiff > 0 || timeDiff < 0) {
        chunks.push({
          value_has_time_diff: 1
        });
        chunks.push({
          value_minutes_diff: timeDiff
        });
      } else if (timeDiff == 0) {
        chunks.push({
          value_has_time_diff: 0
        });
      }
    }

    values.forEach(v => {
      if (data.value_type == 'm' || data.value_type == 'i') {
        if(v % 1 === 0){ // is int
          chunks.push({long_value_has_fraction:0});
        } else {
          chunks.push({long_value_has_fraction:1});
          chunks.push({long_value_fraction:v.toString().split('.')[1].substring(0,2)});
          v = parseInt(v);
        }

        let calculatedValueBaseSize = ( v < 2 ) ? 1 : Math.ceil(Math.log2(v)/8) - 1;
        if(calculatedValueBaseSize >= chunksSchemes.long_value_base.size.length){
          calculatedValueBaseSize = chunksSchemes.long_value_base.size.length - 1;
        }

        chunks.push({long_value_size:calculatedValueBaseSize});
        chunks.push({long_value_sign:(v>0) ? 1 : 0});
        chunks.push({long_value_base:{size:chunksSchemes.long_value_base.size[calculatedValueBaseSize], data:v}});

      } else if (data.value_type == 'e') {
        chunks.push({
          boolean_value: v
        });
      } else if (data.value_type == 't') {
        chunks.push({
          action_trigger_value: v
        });
      }
    });
    return chunks;
  }
  encodeProtocolMessageToBuffer(dataArray, chunksSchemes) {
    const self = this;
    let maskedValues = dataArray.map((obj, objectIndex) => self.maskChunk.apply(self, [obj, objectIndex, chunksSchemes]));
    self.eventHandler.emit('binaryMaskedValues', self.constructor.name, {maskedValues:maskedValues});
    let maskedBitsArray = maskedValues.reduce((merged, block) => {
      merged.push(...block);
      return merged;
    }, []);
    let encodedBuffer = bitwise.buffer.create(maskedBitsArray);
    self.eventHandler.emit('bufferEncoded', self.constructor.name, {byteLength:Buffer.byteLength(encodedBuffer), maskedBitsArray:maskedBitsArray});
    return encodedBuffer;
  }


  decodeProtocolMessageFromBuffer(encodedBuffer, chunksSchemes) {
    const self = this;
    let decodePointer = 0;
    let data = [];
    let decodedMessage = {};
    decodedMessage.cmd = bitwise.buffer.readUInt(encodedBuffer, decodePointer, chunksSchemes.cmd.size);
    let command = chunksSchemes.cmd.value[decodedMessage.cmd];
    decodePointer += parseInt(chunksSchemes.cmd.size);

    if (command == '0') {
      decodedMessage.dev_code = bitwise.buffer.readUInt(encodedBuffer, decodePointer, chunksSchemes.dev_code.size);
      decodePointer += parseInt(chunksSchemes.dev_code.size);
      data.push([null,  chunksSchemes.dev_code.value[decodedMessage.dev_code]]);
    }

    if (command == 'r' || command == 'a' || command == 'o') {
      decodedMessage.is_part = bitwise.buffer.readUInt(encodedBuffer, decodePointer, chunksSchemes.is_part.size);
      decodePointer += parseInt(chunksSchemes.is_part.size);
    }

    if (command == 'r' || command == 'a') {
      decodedMessage.epoch = bitwise.buffer.readUInt(encodedBuffer, decodePointer, chunksSchemes.epoch.size);
      decodePointer += parseInt(chunksSchemes.epoch.size);
    }
    let decodedParts = [];
    let d = 0;
    while ((Buffer.byteLength(encodedBuffer)*8) > decodePointer) {
      decodedParts[d] = {};
      if (command == 'r' || command == 'a') {
        decodedParts[d].device_index = bitwise.buffer.readUInt(encodedBuffer, decodePointer, chunksSchemes.device_index.size);
        decodePointer += parseInt(chunksSchemes.device_index.size);
      }
      if (command == 'o') {
        decodedParts[d].op_io_type = bitwise.buffer.readUInt(encodedBuffer, decodePointer, chunksSchemes.op_io_type.size);
        decodePointer += parseInt(chunksSchemes.op_io_type.size);
        let ioType = chunksSchemes.op_io_type.value[decodedParts[d].op_io_type];
        if (ioType == 'gpio') {
          decodedParts[d].io = bitwise.buffer.readUInt(encodedBuffer, decodePointer, chunksSchemes.op_io_gpio.size);
          decodePointer += parseInt(chunksSchemes.op_io_gpio.size);
        }
        if (ioType == 'port') {
          let portIndex = bitwise.buffer.readUInt(encodedBuffer, decodePointer, chunksSchemes.op_io_port.size);
          decodedParts[d].io = chunksSchemes.op_io_port.value[portIndex];
          decodePointer += parseInt(chunksSchemes.op_io_port.size);
        }
        if (ioType == 'subnetwork') {
          let netId = bitwise.buffer.readUInt(encodedBuffer, decodePointer, chunksSchemes.op_subnetwork_network_id.size);
          decodePointer += parseInt(chunksSchemes.op_subnetwork_network_id.size);
          let nodeId = bitwise.buffer.readUInt(encodedBuffer, decodePointer, chunksSchemes.op_subnetwork_node_id.size);
          decodePointer += parseInt(chunksSchemes.op_subnetwork_node_id.size);
          decodedParts[d].io = netId + '_' + nodeId;
        }
      }

      decodedParts[d].value_type = bitwise.buffer.readUInt(encodedBuffer, decodePointer, chunksSchemes.value_type.size);
      decodePointer += parseInt(chunksSchemes.value_type.size);
      let subValNumber = bitwise.buffer.readUInt(encodedBuffer, decodePointer, chunksSchemes.value_subvalues_number.size);
      decodePointer += parseInt(chunksSchemes.value_subvalues_number.size);

      if (command == 'r' || command == 'a') {
        decodedParts[d].value_has_time_diff = bitwise.buffer.readUInt(encodedBuffer, decodePointer, chunksSchemes.value_has_time_diff.size);
        decodePointer += parseInt(chunksSchemes.value_has_time_diff.size);
        decodedParts[d].value_minutes_diff = 0;
        if (decodedParts[d].value_has_time_diff == 1) {
          decodedParts[d].value_minutes_diff = bitwise.buffer.readUInt(encodedBuffer, decodePointer, chunksSchemes.value_minutes_diff.size);
          decodePointer += parseInt(chunksSchemes.value_minutes_diff.size);
        }
      }
      let values = [];
      for (let i = 0; i < subValNumber; i++) {
        let val = null;
        let fraction = null;
        let valType = chunksSchemes.value_type.value[decodedParts[d].value_type];
        if (valType == 'm' || valType == 'i') {
          let hasFraction = bitwise.buffer.readUInt(encodedBuffer, decodePointer, chunksSchemes.long_value_has_fraction.size);
          decodePointer += parseInt(chunksSchemes.long_value_has_fraction.size);
          if(hasFraction){
            fraction = bitwise.buffer.readUInt(encodedBuffer, decodePointer, chunksSchemes.long_value_fraction.size);
            decodePointer += parseInt(chunksSchemes.long_value_fraction.size);
          }
          let valSizeIndex = bitwise.buffer.readUInt(encodedBuffer, decodePointer, chunksSchemes.long_value_size.size);
          decodePointer += parseInt(chunksSchemes.long_value_size.size);
          let valSign = bitwise.buffer.readUInt(encodedBuffer, decodePointer, chunksSchemes.long_value_sign.size);
          decodePointer += parseInt(chunksSchemes.long_value_sign.size);
          let base = bitwise.buffer.readUInt(encodedBuffer, decodePointer,  chunksSchemes.long_value_base.size[valSizeIndex]);
          decodePointer += parseInt(chunksSchemes.long_value_base.size[valSizeIndex]);
          val = base + (fraction / 100);

        } else if (valType == 'e') {
          val = bitwise.buffer.readUInt(encodedBuffer, decodePointer, chunksSchemes.boolean_value.size);
          decodePointer += parseInt(chunksSchemes.boolean_value.size);
        } else if (valType == 't') {
          val = bitwise.buffer.readUInt(encodedBuffer, decodePointer, chunksSchemes.action_trigger_value.size);
          decodePointer += parseInt(chunksSchemes.action_trigger_value.size);
        }

        values.push(val);
      }
      decodedParts[d].values = values;

      if (command == 'r' || command == 'a') {
        let diffTimestamp = this.decodeTime(decodedMessage.epoch, decodedParts[d].value_minutes_diff);
        data.push([decodedParts[d].device_index, [values, diffTimestamp]]);

      }
      if (command == 'o') {
        data.push([decodedParts[d].io, values]);
      }
      //   break;
      d++;
    }


    decodedMessage.devices = decodedParts;
    return {
      cmd: command,
      results: decodedMessage,
      data: data
    };
  }
  maskChunk(obj, objectIndex, chunksSchemes) {
    const self = this;
    let key = Object.keys(obj)[0];
    let value = Object.values(obj)[0];
    let chunkScheme = chunksSchemes[key];
    if (chunkScheme.min && parseInt(value) < chunkScheme.min) {
      self.eventHandler.emit('binaryChunkMinBounds', self.constructor.name, {key:key, value:value, chunkBounds:chunkScheme.min});
      value = parseInt(chunkScheme.min);
    }
    if (chunkScheme.max && parseInt(value) > chunkScheme.max) {
      self.eventHandler.emit('binaryChunkMaxBounds', self.constructor.name, {key:key, value:value, chunkBounds:chunkScheme.min});
      value = parseInt(chunkScheme.max);
    }

    let size = 0;
    if (!Array.isArray(chunkScheme.size)) {
      size = chunkScheme.size;
    } else if (Array.isArray(chunkScheme.size)) {
      size = value.size;
    }

    if(typeof value.data != 'undefined') {
      value = value.data;
    }
    let binary = parseInt(value).toString(2).split('').map(Number);
    if (binary.length > size) {
      self.eventHandler.emit('binaryChunkSizeExid', self.constructor.name, {key:key, value:value, chunkSize:size, binary:binary, binarySize:binary.length});
      binary = Array.from({
        length: size
      }, (v, i) => 1);
    }

    let maskedPaddedBinary = self.addZeroPadding(size - binary.length, binary);
    self.eventHandler.emit('binaryMaskedPadded', self.constructor.name, {obj:obj, size:size, maskedPaddedBinary:maskedPaddedBinary});
    return maskedPaddedBinary;
  }
  calculateTimeDiff(epochTime, toTime){
    let epochSecondsTime = (Math.ceil(Math.log10(epochTime + 1)) > 10) ? Math.round(epochTime / 1000) : epochTime;
    if(toTime){
      let toSecondsTime = (Math.ceil(Math.log10(toTime + 1)) > 10) ? Math.round(toTime / 1000) : toTime;
      let diffSecondsTime = toSecondsTime - epochSecondsTime;
      let diffMinutesTime = Math.round(diffSecondsTime / 60);
      return diffMinutesTime;
    }
    return epochSecondsTime;
  }

  addZeroPadding(k, value) {
    return Array.from({ length: k }, (v, i) => 0).concat(value);
  }

  mergeData(dataArrays){
    return [].concat.apply([], dataArrays);
  }

  mergeBuffers(buffers){
    return Buffer.concat(buffers);
  }



};
module.exports = BitPacker;
