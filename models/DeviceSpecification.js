
const mongoose = require('mongoose');
const { APIError } = require('../helpers');
const Schema = mongoose.Schema;

const deviceSpecificationSchema = new Schema({
  id: String,
  title: String,
  type: { type: String, enum: ['flowmeter', 'relay_valve', 'moisturedev','soil_trident_rs485','dht', '1w', 'photres', 'mesh_bridge'] }, 
  role: { type: String, enum: ['in', 'out', 'forward'] },
  script: String,
  interpreter: String,
  defaultInterval: String,
  store: [String],
  result: String,
  options: Array
},{collection: 'device_specifications' });






deviceSpecificationSchema.statics = {
  async createDeviceSpecification(newDeviceSpecification) {
    newDeviceSpecification.id = '_spec_' + Math.random().toString(36).substr(2, 9);
    let deviceSpecification = {};


    deviceSpecification = await newDeviceSpecification.save();
    return deviceSpecification.toObject();
  },
  async deleteDeviceSpecification(id) {
    const deleted = await this.findOneAndRemove({ id });
    if (!deleted) {
      throw new APIError(404, 'DeviceSpecification Not Found', `No deviceSpecification '${id}' found.`);
    }
    return deleted.toObject();
  },
  async readDeviceSpecification(id) {
    const deviceSpecification = await this.findOne({ id });

    if (!deviceSpecification) {
      throw new APIError(404, 'DeviceSpecification Not Found', `No deviceSpecification '${id}' found.`);
    }
    return deviceSpecification.toObject();
  },
  async readDeviceSpecifications(query, fields, skip, limit) {
    const deviceSpecifications = await this.find(query, fields)
      .skip(skip)
      .limit(limit)
      .sort({ id: 1 })
      .exec();
    if (!deviceSpecifications.length) {
      return [];
    }
    return deviceSpecifications.map(deviceSpecification => deviceSpecification.toObject());
  },
  async updateDeviceSpecification(id, deviceSpecificationUpdate) {
    const deviceSpecification = await this.findOneAndUpdate({ id }, deviceSpecificationUpdate, {
      new: true
    });
    if (!deviceSpecification) {
      throw new APIError(404, 'DeviceSpecification Not Found', `No deviceSpecification '${id}' found.`);
    }
    return deviceSpecification.toObject();
  }
};
if (!deviceSpecificationSchema.options.toObject) deviceSpecificationSchema.options.toObject = {};
deviceSpecificationSchema.options.toObject.transform = (doc, ret) => {
  const transformed = ret;
  delete transformed._id;
  delete transformed.__v;
  return transformed;
};
deviceSpecificationSchema.index({ id: 1, number: 1 }, { unique: true });

module.exports = mongoose.model('DeviceSpecification', deviceSpecificationSchema);
