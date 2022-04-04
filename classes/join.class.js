const Payload = require('./payload.class.js');
const { PayloadModel } = require('../models');

class Join extends Payload {

  constructor(id, timestamp, ci){
    super(id, null, timestamp, ci, 'join');
  }

  static async generate (params) {
    params.ci_id = params.ci.id;
    let payloadModel = await PayloadModel.createPayload(new PayloadModel(params));
    const {id, timestamp} = payloadModel;
    return new Join(id, timestamp, params.ci);
  }

  static async find (query) {
    let payloadModels = await PayloadModel.readPayloads(query, {}, 0, 1000);
    return Object.values(payloadModels).map((payloadModel) => {
      const {id, timestamp, ci_id} = payloadModel;
      return new Join(id, timestamp, ci_id);
    })
  }

};
module.exports = Join;
