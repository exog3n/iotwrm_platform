const util = require('util')
const fs = require('fs')
class Logger{


  constructor(app) {
    this.app = app;
  }

  info(eventKey, className, message, data){
    let m = "[" + eventKey + "] " + className + ": " + message;
    console.info("[" + eventKey + "] " + className + ": " + message, data);
  }

  warn(eventKey, className, message, data){
    console.warn("[" + eventKey + "] " + className + ": " + message, data);
  }

  error(eventKey, className, message, data){
    console.error("[" + eventKey + "] " + className + ": " + message, data);
  }

  fatal(eventKey, className, message, data){
    console.error(message);
    throw new Error(message);
  }

  debug(eventKey, className, message, data){
    console.log("[" + eventKey + "] " + className + ": " + message);
    console.log(util.inspect(data, {showHidden: false, depth: null}));
  }

  verbose(eventKey, className, message, data){
    console.log("[" + eventKey + "] " + className + ": " + message, data);
    console.trace();
    console.log(process.memoryUsage());
  }

}
module.exports = Logger;
