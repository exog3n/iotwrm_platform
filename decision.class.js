const { DecisionModel } = require('../models');
class Decision{
  constructor(id, devices, source) {
    this.id = id;
    this.devices = devices || [];
    this.model_id = source;
  }
static async DBread (id) {
  const decision = await DecisionModel.readDecision(id);
  return decision;
}
//   await DecisionModel.createDecision(new DecisionModel(params))
async DBupdate (params) {
  const { id } = params;
  await DecisionModel.updateDecision(params);
}
async DBdelete (params) {
  const { id } = params;
  await DecisionModel.deleteDecision(id);
}

flatten(){
  let flat = {};
  Object.assign(flat, this);
  flat.devices = flat.devices.map(dev => dev.id);
  flat.events = flat.events.map(e => e.id);
  return flat;
}

};
module.exports = Decision;
