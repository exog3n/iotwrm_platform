
const mongoose = require('mongoose');
const { APIError } = require('../helpers');
const Schema = mongoose.Schema;

const payloadSchema = new Schema({
  id: String,
  message: Object,
  timestamp: String,
  type: { type: String, enum: ['uplink', 'downlink', 'join'] },
  ci_id: String,
  command: { type: String, enum: ['init', 'ping', 'continue', 'report', 'action', 'operation_profile'] },
  data:Array,
  f_cnt:Number,
  f_port:Number,
  frm_payload:String,
  gw_id:String,
  rssi: Number,
  snr: Number,
  channel_index: Number,
  channel_rssi: Number,
  spreading_factor: Number,
  bandwidth: Number,
  data_rate_index: Number,
  coding_rate: String,
  frequency: Number,
  toa: Number

},{collection: 'payloads' });

payloadSchema.statics = {
  async createPayload(newPayload) {
    let payload = {};
    const duplicate = await this.findOne({ id: newPayload.id });
    if (duplicate) {
      payload = await this.updatePayload(newPayload.id, newPayload);
      console.log(newPayload.id, 'Payload Already Exists. It will get updated instead.')
      return payload;
    }
    payload = await newPayload.save();
    return payload.toObject();
  },
  async deletePayload(id) {
    const deleted = await this.findOneAndRemove({ id });
    if (!deleted) {
      throw new APIError(404, 'Payload Not Found', `No payload '${id}' found.`);
    }
    return deleted.toObject();
  },
  async readPayload(id) {
    const payload = await this.findOne({ id });

    if (!payload) {
      throw new APIError(404, 'Payload Not Found', `No payload '${id}' found.`);
    }
    return payload.toObject();
  },
  async readPayloads(query, fields, skip, limit) {
    const payloads = await this.find(query, fields)
      .skip(skip)
      .limit(limit)
      .sort({ id: 1 })
      .exec();
    if (!payloads.length) {
      return [];
    }
    return payloads.map(payload => payload.toObject());
  },
  async updatePayload(id, payloadUpdate) {
    const payload = await this.findOneAndUpdate({ id }, payloadUpdate, {
      new: true
    });
    if (!payload) {
      throw new APIError(404, 'Payload Not Found', `No payload '${id}' found.`);
    }
    return payload.toObject();
  }
};
if (!payloadSchema.options.toObject) payloadSchema.options.toObject = {};
payloadSchema.options.toObject.transform = (doc, ret) => {
  const transformed = ret;
  delete transformed._id;
  delete transformed.__v;
  return transformed;
};
payloadSchema.index({ id: 1, number: 1 }, { unique: true });

module.exports = mongoose.model('Payload', payloadSchema);
