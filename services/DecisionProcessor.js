const Action = require('../classes/action.class');
const Event = require('../classes/event.class');
const ManagementModel = require('../classes/managementModel.class');
const Measurement = require('../classes/measurement.class');
class DecisionProcessor{
  constructor(rm, recipe, parser, jobManager, dependencies, eventHandler) {
    this.rm = rm;
    this.recipe = recipe;
    this.parser = parser;
    this.jobManager = jobManager;
    this.dependencies = dependencies || {};
    this.eventHandler = eventHandler;
  }

  async initModels(){
    if(this.recipe.models){
      this.managementModels = this.loadManagementModels(this.recipe.models);
      return this.managementModels;
    }
  }
  async createCommand(cmdType, devices, eventValue, source, timestamp){
    const self = this;
    if(cmdType == 'action' && devices.length > 0){
      let time = timestamp || new Date().getTime();
      let params = {type:'trigger', model_id:source, timestamp:time, device_ids:devices.map(d => d.id)};
      let action = await Action.generate(params, devices);
      let events = await Promise.all(devices.map(async (dev) => {
        let ev = await Event.generate({value:eventValue, timestamp:time, device_id:dev.id, action_id:action.id, condition:'pending'}, dev);
        dev.save({latest_report_id:ev.id});
        return ev;
      }));
      let updateParams = {id:action.id, event_ids:events.map(e => e.id)};
      action = await action.save(updateParams, devices, events);
        this.rm.deviceControler.setAction(events, action);
      this.eventHandler.emit('cmdCreated', self.constructor.name, {rmId:self.rm.id, actionId:action.id, events:events});
      return action;
    }
  }




  processData(modelId, from, to) {
    const self = this;
    let modelDependencies = self.dependencies[modelId];
    let model = self.managementModels.find((m) => m.id == modelId);
    Object.values(modelDependencies).forEach((md) => {
      Object.keys(md).forEach((outType) => {
        let outs = md[outType];
        self.eventHandler.emit('modelOutputDevices', self.constructor.name, {rmId:self.rm.id, outDevices:outs});
        Object.keys(outs).forEach((outDevKey) => {
          let out = outs[outDevKey];
          let outputs = {};
          let inputs = {};
          outputs[outType] = outDevKey;
          let inTypes = Object.keys(out);
          self.eventHandler.emit('modelWorkOnOutputs', self.constructor.name, {rmId:self.rm.id, outType:outType, relatedInTypes:inTypes});
          Promise.all(inTypes.map(async (inType) => {
            let ins = out[inType];
            self.eventHandler.emit('modelWorkOnInputs', self.constructor.name, {rmId:self.rm.id, inType:inType, ins:ins});
            //   return false;
            let query = this.rm.dataHandler.generateDeviceBasedQuery(ins, from, to);
            return await this.rm.dataHandler.fetchData(Measurement, query).then(async (data) => {
              return {
                type: inType,
                data: (data.length > 0) ? data : false
              };
            })
          })).then(async (response) => {
            response.forEach(async (r) => {
              if(r.data){
                r.data = self.getDataAverage(r.data);
                self.eventHandler.emit('modelWorkOnInputs', self.constructor.name, {rmId:self.rm.id, outDevKey:outDevKey, resType:r.type, resData:r.data});
                inputs[r.type] = r.data;
              } else {
                self.eventHandler.emit('modelNoDataInput', self.constructor.name, {rmId:self.rm.id, resType:r.type});
                return;
              }
            })

            await model.processData.apply(self, [inputs]).then((results) => {
              self.eventHandler.emit('modelResponse', self.constructor.name, {rmId:self.rm.id, model:model.id, response:results});
              if(!results){
                self.eventHandler.emit('modelDataLack', self.constructor.name, {rmId:self.rm.id, model:model.id});
                return false;
              }
              results.forEach((r)=>{
                let openTimestamp = r[0];
                let closeTimestamp = r[0] + r[1];
                let outDevice = self.rm.deviceControler.getDevice(outDevKey);
                self.createCommand('action', [outDevice], 'on', model.id, openTimestamp);
                self.createCommand('action', [outDevice], 'off', model.id, closeTimestamp);
              })
              outputs[outDevKey] = results;
            });
          })
        })
      })
    })
  }


  getDataAverage(data){
    let avg = data.reduce((a,{value}) => a + parseFloat(value), 0) / data.length;
    return avg;
  }
  daemon(data){
    console.log('* watcher triggered *');
  }
  loadManagementModels(recipeModels){
    const self = this;
    let managementModels = [];
    recipeModels.forEach((m)=>{
      let mm = new ManagementModel(m.id);
      mm.setInputs(m.inputs);
      mm.setOutputs(m.outputs);
      mm.setProcessData(this[mm.id]);
      managementModels.push(mm);
    });
    self.eventHandler.emit('managmentModelsLoaded', self.constructor.name, {rmId:self.rm.id, models:recipeModels.map(m => m.id)});
    return managementModels;
  }


  setDependencies(dependencies){
    this.dependencies = dependencies;
  }
  async dripModel(inputs){

    if(Object.keys(inputs).length === 0){
      console.log('No Drip model inputs to run',inputs)
      return false;
    }
    console.log('Drip model inputs',inputs)
    if(!inputs.moisture){
      console.log('No moisture input')
      return false;
    }
    let options = {
      loc: 261741,
      cr: 1,
      ch: 4,
      cd: 3,
      rz: 0.5,
      st: 1,
      sm: inputs.moisture.value || 0.15,
      fc: 0.23,
      wp: 0.11,
      rew: 6,
      er: 4,
      en: 10
    };

    let base = 'https://drip.gr/api/irrigation_v1.php?';
    let params = Object.entries(options)
      .map(
        ([key, val]) => `${encodeURIComponent(key)}=${encodeURIComponent(val)}`
      )
      .join("&");
    let url = base + params;
    return await this.parser.request(url).then((result)=>{
      let instructions = result.irrigation_seconds;
      return Object.keys(instructions).map((i)=>{
        return [new Date(i).getTime(),instructions[i]];
      })
    })
  }
  simpleTimerModel(){
    const self = this;
    console.log('#DEV# timer started')
    let isOff = true;
    setInterval(()=>{
      let devices = [
        self.rm.deviceControler.devices['_rwarkfszh']
      ];
      self.createCommand('action', devices, 'on', 'simpleTimerModel');
    },5000)
  }

};
module.exports = DecisionProcessor;
