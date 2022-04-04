const { EventModel } = require('../models');
class Event{
  constructor(id, value, timestamp, device, action_id, payload_id, condition) {
    this.id = id;
    this.value = value;
    this.timestamp = timestamp;
    this.device = device || {};
    this.action_id = action_id || null;
    this.payload_id = payload_id;
    this.condition = condition || 'pending';
  }

  updateObject(value, timestamp, condition){
    this.value = value;
    this.timestamp = timestamp;
    this.condition = condition || 'pending';
    return this;
  }
  static async load (id) {
    const {value, timestamp, device_id, condition, action_id, payload_id} = await EventModel.readEvent(id);
    return new Event(id, value, timestamp,device_id, action_id, payload_id, condition);
  }
  static async generate (params, device) {
    const {id, value, timestamp, device_id, condition, action_id} = await EventModel.createEvent(new EventModel(params));
    return new Event(id, value, timestamp, device || device_id, action_id, null, condition);
  }

  async save (params) {
    const {value, timestamp, device_id, condition, action_id} = await EventModel.updateEvent(this.id, params);
    return this.updateObject(value, timestamp, condition);
  }
  async DBdelete (params) {
    const { id } = params;
    await EventModel.deleteEvent(id);
  }

  static async find (query) {
    let eventModels = await EventModel.readEvents(query, {}, 0, 1000);
    return Object.values(eventModels).map((eventModel) => {
      const {id, value, timestamp, device_id, action_id, condition} = eventModel;
      return new Event(id, value, timestamp, device_id, action_id, null, condition);
    })
  }
};
module.exports = Event;
