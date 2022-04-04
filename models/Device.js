
const mongoose = require('mongoose');
const { APIError } = require('../helpers');
const Schema = mongoose.Schema;

const deviceSchema = new Schema({
  id: String,
  title: String,
  specification_id: String,
  role: { type: String, enum: ['in', 'out', 'forward'] }, 
  mc_id: String,
  io: String,
  state: { type: String, enum: ['inactive', 'active', 'on', 'off'] },
  latest_report_id: String
},{collection: 'devices' });

deviceSchema.statics = {
  async createDevice(newDevice) {
    newDevice.id = '_dev_' + Math.random().toString(36).substr(2, 9);
    let device = {};

    device = await newDevice.save();
    return device.toObject();
  },
  async deleteDevice(id) {
    const deleted = await this.findOneAndRemove({ id });
    if (!deleted) {
      return new APIError(404, 'Device Not Found', `No device '${id}' found.`);
    }
    return deleted.toObject();
  },
  async readDevice(id) {
    const device = await this.findOne({ id });

    if (!device) {
      throw new APIError(404, 'Device Not Found', `No device '${id}' found.`);
    }
    return device.toObject();
  },
  async readDevices(query, fields, skip, limit) {
    const devices = await this.find(query, fields)
      .skip(skip)
      .limit(limit)
      .sort({ id: 1 })
      .exec();
    if (!devices.length) {
      return [];
    }
    return devices.map(device => device.toObject());
  },
  async updateDevice(id, deviceUpdate) {
    const device = await this.findOneAndUpdate({ id }, deviceUpdate, {
      new: true
    });
    if (!device) {
      throw new APIError(404, 'Device Not Found', `No device '${id}' found.`);
    }
    return device.toObject();
  }
};
if (!deviceSchema.options.toObject) deviceSchema.options.toObject = {};
deviceSchema.options.toObject.transform = (doc, ret) => {
  const transformed = ret;
  delete transformed._id;
  delete transformed.__v;
  return transformed;
};
deviceSchema.index({ id: 1, number: 1 }, { unique: true });

module.exports = mongoose.model('Device', deviceSchema);
