

class ManagementModel{


  constructor(id) {
    this.id = id;
  }

  setProcessData(callback){
    this.processData = callback;
  }

  setInputs(inputs){
    this.inputs = inputs;
  }

  setOutputs(outputs){
    this.outputs = outputs;
  }

};
module.exports = ManagementModel;
