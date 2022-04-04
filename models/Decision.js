
const mongoose = require('mongoose');
const { APIError } = require('../helpers');
const Schema = mongoose.Schema;

const decisionSchema = new Schema({
  id: String,
  message: Object,
  timestamp: String,
  type: { type: String, enum: ['trigger', 'percent'] },
  model_id: String,
  device_ids: [String],
  event_ids: [String]
},{collection: 'decisions' });

decisionSchema.statics = {
  async createDecision(newDecision) {
    newDecision.id = '_d_' + Math.random().toString(36).substr(2, 9);
    let decision = {};
    decision = await newDecision.save();
    return decision.toObject();
  },
  async deleteDecision(id) {
    const deleted = await this.findOneAndRemove({ id });
    if (!deleted) {
      throw new APIError(404, 'Decision Not Found', `No decision '${id}' found.`);
    }
    return deleted.toObject();
  },
  async readDecision(id) {
    const decision = await this.findOne({ id });

    if (!decision) {
      throw new APIError(404, 'Decision Not Found', `No decision '${id}' found.`);
    }
    return decision.toObject();
  },
  async readDecisions(query, fields, skip, limit) {
    const decisions = await this.find(query, fields)
      .skip(skip)
      .limit(limit)
      .sort({ id: 1 })
      .exec();
    if (!decisions.length) {
      return [];
    }
    return decisions.map(decision => decision.toObject());
  },
  async updateDecision(id, decisionUpdate) {
    const decision = await this.findOneAndUpdate({ id }, decisionUpdate, {
      new: true
    });
    if (!decision) {
      throw new APIError(404, 'Decision Not Found', `No decision '${id}' found.`);
    }
    return decision.toObject();
  }
};
if (!decisionSchema.options.toObject) decisionSchema.options.toObject = {};
decisionSchema.options.toObject.transform = (doc, ret) => {
  const transformed = ret;
  delete transformed._id;
  delete transformed.__v;
  return transformed;
};
decisionSchema.index({ id: 1, number: 1 }, { unique: true });

module.exports = mongoose.model('Decision', decisionSchema);
