const { DeviceModel } = require('../models');
class Device{
  constructor(id, title, specification, role, mcId, io, state, latestReport) {
    this.id = id;
    this.title = title || '';
    this.specification = specification;
    this.role = role || '';
    this.mcId = mcId || '';  
    this.io = io || '';
    this.state = state || 'inactive';
    this.latestReport = latestReport || '';
  }


  updateObject(title, role, mcId, io, state, latestReport){
    this.title = title || '';
    this.role = role || '';
    this.mcId = mcId || '';
    this.io = io || '';
    this.state = state || '';
    this.latestReport = latestReport || '';
    return this;
  }
  static async load (id) {
    const {title, specification_id, role, mc_id, io, state, latest_report_id} = await DeviceModel.readDevice(id);
    return new Device(id, title, specification_id, role, mc_id, io, state, latest_report_id);
  }
  static async generate (params, specification) {
    const {id, title, specification_id, role, mc_id, io, state, latest_report_id} = await DeviceModel.createDevice(new DeviceModel(params));

    return new Device(id, title, specification || specification_id, role, mc_id, io, state, latest_report_id);
  }

  async save (params) {
    const {title, specification_id, role, mc_id, io, state, latest_report_id} = await DeviceModel.updateDevice(this.id, params);
    return this.updateObject(title, role, mc_id, io, state, latest_report_id);
  }
  async remove () {
    await DeviceModel.deleteDevice(this.id);
    return this.id;
  }

  flatten(){
    let flat = {};
    Object.assign(flat, this);
    flat.specification = (flat.specification) ? flat.specification.id : '';
    return flat;
  }

};
module.exports = Device;
