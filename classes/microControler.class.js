const { MicroControlerModel } = require('../models');
class MicroControler{
  constructor(id, role, microControlers, communicationInterface, devices, operationProfile, point, devGroup, active, alive, dependencies, subgroup) {
    this.id = id;
    this.role = role || null;
    this.mcs = microControlers || [];
    this.ci = communicationInterface || {};
    this.devs = devices || {};
    this.op = operationProfile || {};
    this.point = point || {};
    this.devGroup = devGroup || {};
    this.active = active || false;
    this.alive = alive || false;
    this.dependencies = dependencies;
    this.subgroup = subgroup || null;
    this.parent_mc_id = null;
  }
  async setOperationProfile(op){
    this.op = op;
    return this.save({id:this.id, op_id:this.op.id});
  }

  setDevices(devs){
    this.devs = {};
    devs.forEach((dev)=>{
      this.devs[dev.id] = dev;
    })
  }

  async setSubnetwork(mcs, save){
    this.mcs = {};
    mcs.forEach((mc)=>{
      this.mcs[mc.id] = mc;
    })
    if(save){
      await this.save({id:this.id, mc_ids:mcs.map((mc) => mc.id)});
    }
  }
  isAlive(){
    console.log('# MC ' + this.id + ' is alive.');
    this.alive = true;
  }
  isDead(){
    console.log('# MC ' + this.id + ' is dead.');
    this.alive = false;
  }
  static async load (id) {
    let mcModel = await MicroControlerModel.readMicroControler(id);
    const {role, ci_id, dev_ids, mc_ids, op_id, point_id, dev_group, active, alive, dependencies, subgroup} = mcModel;
    return new MicroControler(id, role, mc_ids, ci_id, dev_ids, op_id, point_id, dev_group, active, alive, dependencies, subgroup);
  }
  static async generate (params) {
    let mcModel = await MicroControlerModel.createMicroControler(new MicroControlerModel(params));
    const {id, role, ci_id, dev_ids, mc_ids, op_id, point_id, dev_group, active, alive, dependencies, subgroup} = mcModel;
    return new MicroControler(id, role, mc_ids, ci_id, dev_ids, op_id, point_id, dev_group, active, alive, dependencies, subgroup);
  }
  async save (params) {
    const { id } = params;
    const {role, ci_id, dev_ids, mc_ids, op_id, point_id, dev_group, active, alive, dependencies, subgroup} =  await MicroControlerModel.updateMicroControler(id, params);
    return new MicroControler(id, role, mc_ids, ci_id, dev_ids, op_id, point_id, dev_group, active, alive, dependencies, subgroup);
  }
  async remove () {
    await MicroControlerModel.deleteMicroControler(this.id)
    return this.id;
  }

  flatten(){
    let flat = {};
    Object.assign(flat, this);
    flat.devs = Object.keys(flat.devs) || flat.devs.map(dev => dev.id);
    flat.mcs = Object.keys(flat.mcs) || flat.mcs.map(mc => mc.id);
    flat.ci = flat.ci.id;
    flat.op = flat.op.id;
    return flat;
  }

};
module.exports = MicroControler;
