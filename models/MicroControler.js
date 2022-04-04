
const mongoose = require('mongoose');
const { APIError } = require('../helpers');
const Schema = mongoose.Schema;

const microControlerSchema = new Schema({
  id: String,
  role: { type: String, enum: ['rmc', 'mmc'] }, 
  ci_id: String,
  dev_ids: [String],
  mc_ids: [String],
  op_id: String,
  point_id: [String],
  dev_group: String,
  active: Boolean,
  alive: Boolean,
  dependencies:Object,
  subgroup:String
},{collection: 'micro_controlers' });

microControlerSchema.statics = {
  async createMicroControler(newMicroControler) {
    newMicroControler.id = '_mc_' + Math.random().toString(36).substr(2, 9);
    let microControler = {};

    microControler = await newMicroControler.save();
    return microControler.toObject();
  },
  async deleteMicroControler(id) {
    const deleted = await this.findOneAndRemove({ id });
    if (!deleted) {
      return new APIError(404, 'microControler Not Found', `No microControler '${id}' found.`);
    }
    return deleted.toObject();
  },
  async readMicroControler(id) {
    const microControler = await this.findOne({ id });

    if (!microControler) {
      return new APIError(404, 'microControler Not Found', `No microControler '${id}' found.`);
    }
    return microControler.toObject();
  },
  async readMicroControlers(query, fields, skip, limit) {
    const microControlers = await this.find(query, fields)
      .skip(skip)
      .limit(limit)
      .sort({ id: 1 })
      .exec();
    if (!microControlers.length) {
      return [];
    }
    return microControlers.map(microControler => microControler.toObject());
  },
  async updateMicroControler(id, microControlerUpdate) {
    const microControler = await this.findOneAndUpdate({ id }, microControlerUpdate, {
      new: true
    });
    if (!microControler) {
      throw new APIError(404, 'microControler Not Found', `No microControler '${id}' found.`);
    }
    return microControler.toObject();
  }
};
if (!microControlerSchema.options.toObject) microControlerSchema.options.toObject = {};
microControlerSchema.options.toObject.transform = (doc, ret) => {
  const transformed = ret;
  delete transformed._id;
  delete transformed.__v;
  return transformed;
};
microControlerSchema.index({ id: 1, number: 1 }, { unique: true });

module.exports = mongoose.model('MicroControler', microControlerSchema);
