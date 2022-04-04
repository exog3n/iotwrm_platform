const { OperationProfileModel } = require('../models');
class OperationProfile{
  constructor(id, mcId, microControlerProfiles, communicationInterfaceProfiles, devicesProfiles, subnetworks) {
    this.id = id;
    this.mcId = mcId;
    this.mcs = microControlerProfiles || {};
    this.cis = communicationInterfaceProfiles || {};
    this.devs = devicesProfiles || {};
    this.subnetworks = subnetworks || {};
  }
static async load (id) {
  const {mc_id, mcs, cis, devs, subnetworks} = await OperationProfileModel.readOperationProfile(id);
  return new OperationProfile(id, mc_id, mcs, cis, devs, subnetworks);
}
static async generate (params) {
  const {id, mc_id, mcs, cis, devs, subnetworks} = await OperationProfileModel.createOperationProfile(new OperationProfileModel(params));
  return new OperationProfile(id, mc_id, mcs, cis, devs, subnetworks);
}
async DBupdate (params) {
  const { id } = params;
  await OperationProfileModel.updateOperationProfile(params);
}
async remove () {
  await OperationProfileModel.deleteOperationProfile(this.id);
  return this.id;
}
};
module.exports = OperationProfile;
