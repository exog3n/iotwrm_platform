const OperationProfile = require('../classes/operationProfile.class');
class OperationComposer{
  constructor(rm, eventHandler) {
    this.rm = rm;
    this.config = rm.getSystemConfig() || {};
    this.setup = rm.getOperationSetup() || {};
    this.profiles = {};
    this.eventHandler = eventHandler;
  }
  async initializeOperationProfiles(rmcs){
    return await Promise.all(rmcs.map(async (rmc) => {
      return await this.initializeOperationProfile(rmc);
    }))
  }

  async reinitializeOperationProfiles(rmcs){
    return await Promise.all(rmcs.map(async (rmc) => {
      return await this.reinitializeOperationProfile(rmc);
    }))
  }
  async initializeOperationProfile(rmc){
    const self = this;
    let op = null;
      if (!Object.keys(rmc.op).length){
        op = await self.buildOperationProfile(rmc);
        self.eventHandler.emit('opCreated', self.constructor.name, {rmId: self.rm.id, rmcId:rmc.id, op:op.id});
      } else if (typeof rmc.op === 'string' || rmc.op instanceof String){
        op = await OperationProfile.load(rmc.op);
        self.eventHandler.emit('opExist', self.constructor.name, {rmId: self.rm.id, rmcId:rmc.id, op:op.id});
      } else {
        self.eventHandler.emit('opLoaded', self.constructor.name, {rmId: self.rm.id, rmcId:rmc.id, op:rmc.op.id});        return rmc;
      }
      rmc.setOperationProfile(op);
      self.profiles[op.id] = op;
      return rmc;
  }

  async reinitializeOperationProfile(rmc){
    let op = await this.buildOperationProfile(rmc);
    this.eventHandler.emit('opCreated', self.constructor.name, {rmId: self.rm.id, rmcId:rmc.id, op:op.id});
    rmc.setOperationProfile(op);
    this.profiles[op.id] = op;
    return rmc;
  }
  buildOperationProfile(mc) {
    const self = this;

    const config = self.config;
    const setup = self.setup;
    let opMap = {};
    opMap['mcs'] = {};
    opMap['cis'] = {};
    opMap['subnetworks'] = {
      enum: [],
      devs: {}
    };
    opMap.cis['rciid'] = mc.ci.id;
    opMap.cis['enum'] = [];
    opMap['devs'] = {};
    // map devs
    console.log('#Operation composer# buildOperationProfile for', mc.id);
    Object.keys(mc.devs).forEach((d)=>{
      let dev = mc.devs[d];
      if(mc.devGroup.premapped){
        opMap.cis.enum[dev.io] = dev.id;
      } else {
        opMap.cis.enum.push(dev.id);
      }
      let specs = config.specifications;
      let specDevType = Object.keys(specs).find((k) => {
        return specs[k] === dev.specification.type;
      });
      let task = mc.devGroup.task;
      if(!setup[task]){console.log('The attached task is not exist in operation setup')}
      opMap.devs[dev.id] = {};
      opMap.devs[dev.id]['io'] = dev.io;
      opMap.devs[dev.id][dev.role] = setup[task][dev.role][specDevType];
    });
    //
    Object.keys(mc.mcs).forEach((k)=>{
      let mmc = mc.mcs[k];
      let mcci = mmc.ci;
      let mdevs = mmc.devs;
      if(!mdevs){
        throw new Error('MMC devices has not assigned succesfully (will be solved on rerun)');
      }
      let soloDevice = Object.values(mdevs)[0];
      if(!soloDevice){
        console.error('ERROR: something wrong with the devices of', mc)
      }

      opMap.cis.enum.push(soloDevice.id);
      opMap.subnetworks.enum.push(soloDevice.id);

      let specs = config.specifications;
      let specDevType = Object.keys(specs).find((k) => {
        return specs[k] === soloDevice.specification.type;
      });
      let task = mmc.devGroup.task;
      opMap.subnetworks.devs[soloDevice.id] = {};
      opMap.subnetworks.devs[soloDevice.id]['channel'] = mmc.ci.channel;
      opMap.subnetworks.devs[soloDevice.id]['netId'] = mmc.ci.netId;
      opMap.subnetworks.devs[soloDevice.id]['io'] = soloDevice.io;
      opMap.devs[soloDevice.id] = {};
      opMap.devs[soloDevice.id]['channel'] = mmc.ci.channel;
      opMap.devs[soloDevice.id]['netId'] = mmc.ci.netId;
      opMap.devs[soloDevice.id]['io'] = soloDevice.io;
    })


    opMap.cis['options'] = {};
    opMap.cis.options['interval'] = 60

    let { mcs, cis, devs, subnetworks } = opMap;
    let params = {mc_id:mc.id, mcs:mcs, cis:cis, devs:devs, subnetworks:subnetworks}
    return OperationProfile.generate(params);
};

  getOperationProfiles(opIds) {
    console.log(this.profiles)
    let ops = opIds.map(opId => this.profiles[opId]);
    return ops;
  }

}

module.exports = OperationComposer;
