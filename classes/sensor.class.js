const Device = require('./device.class.js');
const { DeviceModel } = require('../models');

class Sensor extends Device {


  constructor(id, title, specification, role, mcId, io, state, latestReport){
    super(id, title, specification, role, mcId, io, state, latestReport);
    this.role = 'in';
  }

  static async load (id) {
    const {title, specification_id, role, mc_id, io, state, latest_report_id} = await DeviceModel.readDevice(id);
    return new Sensor(id, title, specification_id, role, mc_id, io, state, latest_report_id);
  }

  static async generate (params, specification) {
    const {id, title, specification_id, role, mc_id, io, state, latest_report_id} = await DeviceModel.createDevice(new DeviceModel(params));
    return new Sensor(id, title, specification || specification_id, role, mc_id, io, state, latest_report_id);
  }
};
module.exports = Sensor;
