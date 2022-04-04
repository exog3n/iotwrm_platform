const Measurement = require('../classes/measurement.class');
const Event = require('../classes/event.class');
const Sensor = require('../classes/sensor.class');
const Actuator = require('../classes/actuator.class');
const Uplink = require('../classes/uplink.class');
const Downlink = require('../classes/downlink.class');
const Join = require('../classes/join.class');

const Action = require('../classes/action.class');
class DataHandler {
  constructor(rm, eventHandler) {
    this.rm = rm;
    this.eventHandler = eventHandler;
  }
  async fetchEdgeReports(uplink, timestamp){
    const self = this;
    let uplinkData = uplink.data;
    let data = [];
    await Promise.all(uplinkData.map(async (ud) => {
      if(!ud[0]){
        self.eventHandler.emit('noDevIndex', self.constructor.name, {rmId: self.rm.id, uplinkData:ud});
        return;
      }
      let dev = this.rm.deviceControler.getDevice(ud[0]);
      let values = ud[1][0];
      if(ud[1][0].split){
        values = ud[1][0].split(';');
      }
      for (let i=0 ; i < values.length ; i++){
        let data_specification = dev.specification.store[i];
        let value = values[i];
        timestamp = ud[1][1] || timestamp;
        let d = null;
        if (dev instanceof Sensor) {
          let params = {value:value, timestamp:timestamp, device_id:dev.id, payload_id:uplink.id, data_specification:data_specification};
          d = await Measurement.generate(params, dev);
          dev.save({state: 'active', latest_report_id:d.id});
          self.eventHandler.emit('newMeasurement', self.constructor.name, {rmId: self.rm.id, mId:d.id, mTime:d.timestamp, mValue:d.value});
        }
        else if (dev instanceof Actuator) {
          value = (value == 1) ? 'on' : 'off';
          let params = {value:value, timestamp:timestamp, device_id:dev.id, payload_id:uplink.id, data_specification:data_specification};
          if(dev.latestReport){
            let latestEvent = await Event.load(dev.latestReport);
            if(latestEvent.value === value){
              d = await latestEvent.save({condition:'completed'});
              dev.save({state: d.value});
              self.eventHandler.emit('eventCompleted', self.constructor.name, {rmId: self.rm.id, devId: dev.id, eId:d.id, eTime:d.timestamp, eValue:d.value});
            }
            else if(latestEvent.value !== value){
              d = await latestEvent.save({condition:'canceled'});
              self.eventHandler.emit('eventCanceled', self.constructor.name, {rmId: self.rm.id, devId: dev.id, eId:d.id, eTime:d.timestamp, eValue:d.value});
            }
          }
          else {
          }

        }
        data.push(d);
      }
    }))
    return data;
  }
  async fetchData(dataClass, query) {
    const self = this;
    let results = await dataClass.find(query);
    self.eventHandler.emit('fetchData', self.constructor.name, {rmId: self.rm.id, dataClass:dataClass, query:query, results:results});
    return results;
  }
  generateTimeBasedQuery(devIds, timestamp){
    const self = this;
    if(!devIds){
      self.eventHandler.emit('emptyDevsQuery', self.constructor.name, {rmId: self.rm.id});
      return {};
    }
    let queryIds = devIds.map((id) => { return {device_id:id}});
    return self.buildTimestampQuery(queryIds, timestamp);
  }
  generateDeviceBasedQuery(devIds, from, to){
    const self = this;
    if(!devIds){
      self.eventHandler.emit('emptyDevsQuery', self.constructor.name, {rmId: self.rm.id});
      return {};
    }
    let queryIds = devIds.map((id) => { return {device_id:id}});
    return this.buildQuery(queryIds, from, to);
  }

  generateRelatedDevicesBasedQuery(devIds, from, to){
    if(!devIds){
      self.eventHandler.emit('emptyDevsQuery', self.constructor.name, {rmId: self.rm.id});
      return {};
    }
    let queryIds = devIds.map((id) => { return {device_ids: {$in : [id]}}});
    return this.buildQuery(queryIds, from, to);
  }
  generateComInterfaceBasedQuery(ciIds, from, to){
    if(!ciIds){
      return {};
    }
    let queryIds = ciIds.map((id) => { return {ci_id:id}});
    return this.buildQuery(queryIds, from, to);
  }

  buildQuery(queryIds, from, to){
    from = from || 0;
    to = to || Date.now()
    return {
      $and: [{
          $or: queryIds
        },
        {
          timestamp: {
            $gt: from
          }
        },
        {
          timestamp: {
            $lt: to
          }
        }
      ]
    }
  }

  buildTimestampQuery(queryIds, timestamp){
    return {
      $and: [{
          $or: queryIds
        },
        {
          timestamp: {
            $eq: timestamp
          }
        }
      ]
    }
  }

  async fetchMeasurements(devIds, from, to){
    const self = this;
    let query = self.generateDeviceBasedQuery(devIds, from, to);
    let measurements = await self.fetchData(Measurement, query);
    return measurements;
  }

  async fetchEvents(devIds, from, to){
    const self = this;
    let query = self.generateDeviceBasedQuery(devIds, from, to);
    let events = await self.fetchData(Event, query);
    return events;
  }

  async fetchActions(devIds, from, to){
    const self = this;
    let query = self.generateRelatedDevicesBasedQuery(devIds, from, to);
    let actions = await self.fetchData(Action, query);
    return actions;
  }

  async fetchUplinks(ciIds, from, to){
    const self = this;
    let query = self.generateComInterfaceBasedQuery(ciIds, from, to);
    let uplinks = await self.fetchData(Uplink, query);
    return uplinks;
  }

  async fetchDownlinks(ciIds, from, to){
    const self = this;
    let query = self.generateComInterfaceBasedQuery(ciIds, from, to);
    let downlinks = await self.fetchData(Downlink, query);
    return downlinks;
  }

  async fetchJoins(ciIds, from, to){
    const self = this;
    let query = self.generateComInterfaceBasedQuery(ciIds, from, to);
    let joins = await self.fetchData(Join, query);
    return joins;
  }

  async loadEvents(ids){
    return await Promise.all(ids.map(async (id) => await Event.load(id)));
  }

  async findEvents(devIds, timestamp){
    const self = this;
    let query = self.generateTimeBasedQuery(devIds, timestamp);
    const util = require('util')
    let events = await self.fetchData(Event, query);
    return events;
  }

};
module.exports = DataHandler;
