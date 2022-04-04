const Decision = require('./decision.class.js');
const { DecisionModel } = require('../models');


class Action extends Decision {


  constructor(id, devices, type, source, timestamp, events){
    super(id, devices, source);
    // this.event = event || {};
    this.type = type || {};
    this.timestamp = timestamp || null; // only if timestamp is set then the action will be sceduled
    this.events = events || [];
  }

  static async generate (params, devices, events) {
    const {id, device_ids, type, model_id, timestamp, event_ids} = await DecisionModel.createDecision(new DecisionModel(params));
    return new Action(id, devices || device_ids, type, model_id, timestamp, events || event_ids);
  }

  async save (params, devices, events) {
    const { id } = params;
    const {device_ids, type, model_id, timestamp, event_ids} =  await DecisionModel.updateDecision(id, params);
    return new Action(id, devices || device_ids, type, model_id, timestamp, events || event_ids);
  }

  static async find (query) { // returned flatten instance
    let decisionModels = await DecisionModel.readDecisions(query, {}, 0, 1000);
    return Object.values(decisionModels).map((decisionModel) => {
      const {id, device_ids, type, model_id, timestamp, event_ids} = decisionModel;
      return new Action(id, device_ids, type, model_id, timestamp, event_ids);
    })
  }
};
module.exports = Action;
