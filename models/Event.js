
const mongoose = require('mongoose');
const { APIError } = require('../helpers');
const Schema = mongoose.Schema;

const eventSchema = new Schema({
  id: String,
  value: { type: String, enum: ['on', 'off'] },
  timestamp: String,
  device_id: String,
  payload_id: String,
  action_id: String,
  condition: { type: String, enum: ['canceled', 'pending', 'completed'] }
},{collection: 'events' });

eventSchema.statics = {
  async createEvent(newEvent) {
    newEvent.id = '_e_' + Math.random().toString(36).substr(2, 9);
    let eventObj = {};
    eventObj = await newEvent.save();
    return eventObj.toObject();
  },
  async deleteEvent(id) {
    const deleted = await this.findOneAndRemove({ id });
    if (!deleted) {
      throw new APIError(404, 'Event Not Found', `No event '${id}' found.`);
    }
    return deleted.toObject();
  },
  async readEvent(id) {
    const eventObj = await this.findOne({ id });

    if (!eventObj) {
      throw new APIError(404, 'Event Not Found', `No event '${id}' found.`);
    }
    return eventObj.toObject();
  },
  async readEvents(query, fields, skip, limit) {
    const events = await this.find(query, fields)
      .skip(skip)
      .limit(limit)
      .sort({ id: 1 })
      .exec();
    if (!events.length) {
      return [];
    }
    return events.map(event => event.toObject());
  },
  async updateEvent(id, eventUpdate) {
    const eventObj = await this.findOneAndUpdate({ id }, eventUpdate, {
      new: true
    });
    if (!eventObj) {
      throw new APIError(404, 'Event Not Found', `No event '${id}' found.`);
    }
    return eventObj.toObject();
  }
};
if (!eventSchema.options.toObject) eventSchema.options.toObject = {};
eventSchema.options.toObject.transform = (doc, ret) => {
  const transformed = ret;
  delete transformed._id;
  delete transformed.__v;
  return transformed;
};
eventSchema.index({ id: 1, number: 1 }, { unique: true });

module.exports = mongoose.model('Event', eventSchema);
