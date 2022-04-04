const { PayloadModel } = require('../models');
class Payload{
  constructor(id, message, timestamp, ci, type, command) {
    this.id = id;
    this.message = message || {};
    this.timestamp = timestamp;
    this.ci = ci || {};
    this.type = type;
    this.command = command;
  }
  static async DBread (id) {
    const payload = await PayloadModel.readPayload(id);
    return payload;
  }
  static async DBcreate (object) {
    object['ci_id'] = object.ci.id;
    delete object.ci;
    await PayloadModel.createPayload(new PayloadModel(object))
  }
  async DBupdate (params) {
    const { id } = params;
    await PayloadModel.updatePayload(params);
  }
  async DBdelete (params) {
    const { id } = params;
    await PayloadModel.deletePayload(id);
  }

  static async DBfind (query, fields) {
    return await PayloadModel.readPayloads(query, {}, 0, 1000).then(
      (data) => {
        return Object.values(data).map((d) => {
          let {id, message, timestamp, ci, type, command} = d;
          return new Payload(id, message, timestamp, ci, type, command);
        })
      }
    );
  }

  flatten(){
    let flat = {};
    Object.assign(flat, this);
    flat.ci = (flat.ci) ? flat.ci.id : '';
    return flat;
  }

};

module.exports = Payload;
