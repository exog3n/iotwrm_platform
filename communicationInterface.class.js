const { CommunicationInterfaceModel } = require('../models');



class CommunicationInterface{


  constructor(id, protocol, channel, netId, dClass, q, mcId) {
    this.id = id;
    // this.point = point || {};
    this.protocol = protocol;
    this.channel = channel;
    this.netId = netId;
    this.dClass = dClass;
    this.q = q || [];
    this.mcId = mcId || null;

  }


  queueShift(number, fromTime, toTime){
    const self = this;
    if(fromTime, toTime){

      let counter = 0;
      let elements = [];
      for(let i = 0 ; i < self.q.length ; i++){
        let e = self.q[i];
        if(e.timestamp > fromTime && e.timestamp <= toTime && counter < number){
          elements.push(e);
          self.q.splice(i,1);
          counter++;
          i--;
        }
      }
      return elements;
    }
    // equal to the lenth of the message
    return this.q.splice(0, number);
  }
  flushQueue(){
    this.q = [];
  }
  hasQueue(){
    return this.q.length > 0;
  }
  static async load (id) {
    const {protocol, channel, network_id, dClass, q} = await CommunicationInterfaceModel.readCommunicationInterface(id);
    return new CommunicationInterface(id, protocol, channel, network_id, dClass, q);
  }
  static async generate (params) {
      let ciModel = await CommunicationInterfaceModel.createCommunicationInterface(new CommunicationInterfaceModel(params));
      const {id, protocol, channel, network_id, dClass, q} = ciModel;
      return new CommunicationInterface(id, protocol, channel, network_id, dClass, q);
  }
  async DBupdate (params) {
    const { id } = params;
    return await CommunicationInterfaceModel.updateCommunicationInterface(params);
  }
  async DBdelete (params) {
    const { id } = params;
    await CommunicationInterfaceModel.deleteCommunicationInterface(id);
  }

};
module.exports = CommunicationInterface;
