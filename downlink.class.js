const Payload = require('./payload.class.js');
const { PayloadModel } = require('../models');
class Downlink extends Payload {
  constructor(id, message, timestamp, ci, command){
    super(id, message, timestamp, ci, 'downlink', command);
  }

  static async generate (params) {
    params.ci_id = params.ci.id;
    let payloadModel = await PayloadModel.createPayload(new PayloadModel(params));
    const {id, message, timestamp, payload_id, command, info} = payloadModel;
    return new Downlink(id, message, timestamp, params.ci, command);
  }

  static async find (query) {
    let payloadModels = await PayloadModel.readPayloads(query, {}, 0, 1000);
    return Object.values(payloadModels).map((payloadModel) => {
      const {id, message, timestamp, ci_id, payload_id, command, info} = payloadModel;
      return new Downlink(id, message, timestamp, ci_id, command);
    })
  }
};
module.exports = Downlink;
