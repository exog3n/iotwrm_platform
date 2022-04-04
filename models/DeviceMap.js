
const mongoose = require('mongoose');
const { APIError } = require('../helpers');
const Schema = mongoose.Schema;

const deviceMapSchema = new Schema({ 
  id: String,
  title: String,

  nodes: [{
    rmc_id: String,

  }]
},{collection: 'device_maps' });

deviceMapSchema.statics = {
  async createDeviceMap(newDeviceMap) {
    newDeviceMap.id = '_dm_' + Math.random().toString(36).substr(2, 9);
    let deviceMap = {};
    deviceMap = await newDeviceMap.save();
    return deviceMap.toObject();
  },
  async deleteDeviceMap(id) {
    const deleted = await this.findOneAndRemove({ id });
    if (!deleted) {
      throw new APIError(404, 'DeviceMap Not Found', `No deviceMap '${id}' found.`);
    }
    return deleted.toObject();
  },
  async readDeviceMap(id) {
    const deviceMap = await this.findOne({ id });

    if (!deviceMap) {
      throw new APIError(404, 'DeviceMap Not Found', `No deviceMap '${id}' found.`);
    }
    return deviceMap.toObject();
  },
  async readDeviceMaps(query, fields, skip, limit) {
    const deviceMaps = await this.find(query, fields)
      .skip(skip)
      .limit(limit)
      .sort({ id: 1 })
      .exec();
    if (!deviceMaps.length) {
      return [];
    }
    return deviceMaps.map(deviceMap => deviceMap.toObject());
  },
  async updateDeviceMap(id, deviceMapUpdate) {
    const deviceMap = await this.findOneAndUpdate({ id }, deviceMapUpdate, {
      new: true
    });
    if (!deviceMap) {
      throw new APIError(404, 'DeviceMap Not Found', `No deviceMap '${id}' found.`);
    }
    return deviceMap.toObject();
  }
};
if (!deviceMapSchema.options.toObject) deviceMapSchema.options.toObject = {};
deviceMapSchema.options.toObject.transform = (doc, ret) => {
  const transformed = ret;
  delete transformed._id;
  delete transformed.__v;
  return transformed;
};
deviceMapSchema.index({ id: 1, number: 1 }, { unique: true });

module.exports = mongoose.model('DeviceMap', deviceMapSchema);
