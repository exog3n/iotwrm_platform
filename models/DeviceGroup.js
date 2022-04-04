
const mongoose = require('mongoose');
const { APIError } = require('../helpers');
const Schema = mongoose.Schema;

const deviceGroupSchema = new Schema({ 
  id: String,
  title: String,
  task: { type: String, enum: ['supply', 'irrigation', 'fertilizing', 'reporting'] },
  extended: Boolean,
  devices: Object,
  dependencies: Object,
  subgroups:Object
},{collection: 'device_groups' });

deviceGroupSchema.statics = {
  async createDeviceGroup(newDeviceGroup) {
    let deviceGroup = {};
    const duplicate = await this.findOne({ id: newDeviceGroup.id });
    if (duplicate) {
      deviceGroup = await this.updateDeviceGroup(newDeviceGroup.id, newDeviceGroup);
      console.log(newDeviceGroup.id, 'DeviceGroup Already Exists. It will get updated instead.')
      return deviceGroup;
    }
    deviceGroup = await newDeviceGroup.save();
    return deviceGroup.toObject();
  },
  async deleteDeviceGroup(id) {
    const deleted = await this.findOneAndRemove({ id });
    if (!deleted) {
      throw new APIError(404, 'DeviceGroup Not Found', `No deviceGroup '${id}' found.`);
    }
    return deleted.toObject();
  },
  async readDeviceGroup(id) {
    const deviceGroup = await this.findOne({ id });

    if (!deviceGroup) {
      throw new APIError(404, 'DeviceGroup Not Found', `No deviceGroup '${id}' found.`);
    }
    return deviceGroup.toObject();
  },
  async readDeviceGroups(query, fields, skip, limit) {
    const deviceGroups = await this.find(query, fields)
      .skip(skip)
      .limit(limit)
      .sort({ id: 1 })
      .exec();
    if (!deviceGroups.length) {
      return [];
    }
    return deviceGroups.map(deviceGroup => deviceGroup.toObject());
  },
  async updateDeviceGroup(id, deviceGroupUpdate) {
    const deviceGroup = await this.findOneAndUpdate({ id }, deviceGroupUpdate, {
      new: true
    });
    if (!deviceGroup) {
      throw new APIError(404, 'DeviceGroup Not Found', `No deviceGroup '${id}' found.`);
    }
    return deviceGroup.toObject();
  }
};
if (!deviceGroupSchema.options.toObject) deviceGroupSchema.options.toObject = {};
deviceGroupSchema.options.toObject.transform = (doc, ret) => {
  const transformed = ret;
  delete transformed._id;
  delete transformed.__v;
  return transformed;
};
deviceGroupSchema.index({ id: 1, number: 1 }, { unique: true });

module.exports = mongoose.model('DeviceGroup', deviceGroupSchema);
