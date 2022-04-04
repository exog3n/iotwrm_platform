
const mongoose = require('mongoose');
const { APIError } = require('../helpers');
const Schema = mongoose.Schema;

const pointSchema = new Schema({
  id: String,
  title: String,
  type: { type: String, enum: ['station', 'crop', 'field', 'collector', 'route', 'resource'] }, 
  location: {
    type: {
      type: String,
      enum: ['Point'],
    },
    coordinates: {
      type: [Number],
    }
  },
  root_point_id: String,
  parent_id: String,
  children_ids: [String],
  mc_ids: [String],
},{collection: 'points' });

pointSchema.statics = {
  async createPoint(newPoint) {
    newPoint.id = '_p_' + Math.random().toString(36).substr(2, 9);
    let point = {};

    point = await newPoint.save();
    return point.toObject();
  },
  async deletePoint(id) {
    const deleted = await this.findOneAndRemove({ id });
    if (!deleted) {
      throw new APIError(404, 'Point Not Found', `No point '${id}' found.`);
    }
    return deleted.toObject();
  },
  async readPoint(id) {
    const point = await this.findOne({ id });

    if (!point) {
      throw new APIError(404, 'Point Not Found', `No point '${id}' found.`);
    }
    return point.toObject();
  },
  async readPoints(query, fields, skip, limit) {
    const points = await this.find(query, fields)
      .skip(skip)
      .limit(limit)
      .sort({ id: 1 })
      .exec();
    if (!points.length) {
      return [];
    }
    return points.map(point => point.toObject());
  },
  async updatePoint(id, pointUpdate) {
    const point = await this.findOneAndUpdate({ id }, pointUpdate, {
      new: true
    });
    if (!point) {
      throw new APIError(404, 'Point Not Found', `No point '${id}' found.`);
    }
    return point.toObject();
  }
};
if (!pointSchema.options.toObject) pointSchema.options.toObject = {};
pointSchema.options.toObject.transform = (doc, ret) => {
  const transformed = ret;
  delete transformed._id;
  delete transformed.__v;
  return transformed;
};
pointSchema.index({ id: 1, number: 1 }, { unique: true });

module.exports = mongoose.model('Point', pointSchema);
