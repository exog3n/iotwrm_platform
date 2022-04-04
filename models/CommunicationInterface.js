
const mongoose = require('mongoose');
const { APIError } = require('../helpers');
const Schema = mongoose.Schema;

const communicationInterfaceSchema = new Schema({
  id: String,
  protocol: { type: String, enum: ['lora', 'rfm69'] },
  channel: String,
  network_id: String,
  dClass: String,
  q: Array
},{collection: 'communication_interfaces' });

communicationInterfaceSchema.statics = {
  async createCommunicationInterface(newCommunicationInterface) {
    let communicationInterface = {};
    const duplicate = await this.findOne({ id: newCommunicationInterface.id });
    if (duplicate) {
      communicationInterface = await this.updateCommunicationInterface(newCommunicationInterface.id, newCommunicationInterface);
      console.log(newCommunicationInterface.id, 'CommunicationInterface Already Exists. It will get updated instead.')
      return communicationInterface;
    }
    communicationInterface = await newCommunicationInterface.save();
    return communicationInterface.toObject();
  },
  async deleteCommunicationInterface(id) {
    const deleted = await this.findOneAndRemove({ id });
    if (!deleted) {
      throw new APIError(404, 'CommunicationInterface Not Found', `No communicationInterface '${id}' found.`);
    }
    return deleted.toObject();
  },
  async readCommunicationInterface(id) {
    const communicationInterface = await this.findOne({ id });

    if (!communicationInterface) {
      throw new APIError(404, 'CommunicationInterface Not Found', `No communicationInterface '${id}' found.`);
    }
    return communicationInterface.toObject();
  },
  async readCommunicationInterfaces(query, fields, skip, limit) {
    const communicationInterfaces = await this.find(query, fields)
      .skip(skip)
      .limit(limit)
      .sort({ id: 1 })
      .exec();
    if (!communicationInterfaces.length) {
      return [];
    }
    return communicationInterfaces.map(communicationInterface => communicationInterface.toObject());
  },
  async updateCommunicationInterface(id, communicationInterfaceUpdate) {
    const communicationInterface = await this.findOneAndUpdate({ id }, communicationInterfaceUpdate, {
      new: true
    });
    if (!communicationInterface) {
      throw new APIError(404, 'CommunicationInterface Not Found', `No communicationInterface '${id}' found.`);
    }
    return communicationInterface.toObject();
  }
};
if (!communicationInterfaceSchema.options.toObject) communicationInterfaceSchema.options.toObject = {};
communicationInterfaceSchema.options.toObject.transform = (doc, ret) => {
  const transformed = ret;
  delete transformed._id;
  delete transformed.__v;
  return transformed;
};
communicationInterfaceSchema.index({ id: 1, number: 1 }, { unique: true }); // example compound idx

module.exports = mongoose.model('CommunicationInterface', communicationInterfaceSchema);
