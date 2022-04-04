const EventEmitter = require('events');
const Logger = require('./Logger');
const eventsList = require('../data/events.json');

class EventHandler extends EventEmitter{

  constructor(app, config) {
    super();
    this.app = app;
    this.events = eventsList;
    this.logging = config.logging;
    this.logger = new Logger(app);
  }

  initListeners(){
    const self = this;
    Object.keys(self.events).forEach((eventKey) => {
      let eventOptions = self.events[eventKey];
      self.on(eventKey, (className, data) =>{
        return self.eventHandle.call(self, eventKey, eventOptions, className, data)
      });
    })
  }

  eventHandle(eventKey, eventOptions, className, data){
    const self = this;
    if(self.logging.services.includes("all") || self.logging.services.includes(className)){
      if(self.logging.types.includes(eventOptions.log) && (eventOptions.level <=  self.logging.level)){ 
        this.logger[eventOptions.log].call(self, eventKey, className, eventOptions.message, data)
      }
    }
  }

}
module.exports = EventHandler;
