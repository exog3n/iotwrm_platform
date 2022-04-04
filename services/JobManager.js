const schedule = require('node-schedule');
class JobManager{
  constructor(rm, eventHandler) {
    this.rm = rm;
    this.jobs = [];
    this.eventHandler = eventHandler;
  }

  createIntervalCronSchedule(interval, unit, fn){
    const self = this;
    const job = schedule.scheduleJob(this.intervalTranslate(interval, unit), async () => {
      self.eventHandler.emit('cronIntervalJobStarted', self.constructor.name, {rmId:self.rm.id});
      fn.apply();
    });
    this.jobs.push(job);
  }

  createMomentCronSchedule(moments, unit, fn){
    const job = schedule.scheduleJob(this.momentsTranslate(moments, unit), async () => {
      console.log('Job execution', new Date());
      fn.apply();
    });
    this.jobs.push(job);
  }

  createDateSchedule(date, fn){
    const job = schedule.scheduleJob(date, async () => {
      console.log('Job execution', new Date());
      fn.apply();
    });
    this.jobs.push(job);
  }

  intervalTranslate(interval, unit){
    const self = this;
    let cronString = '';
    if(unit == 's'){
      cronString = '*/' + interval + ' * * * * *';
    }
    if(unit == 'm'){
      cronString = '0 */' + interval + ' * * * *';
    }
    if(unit == 'h'){
      cronString = '0 0 */' + interval + ' * * *';
    }
    self.eventHandler.emit('cronStringGeneration', self.constructor.name, {rmId:self.rm.id, cronString:cronString});
    return cronString;
  }

  momentsTranslate(moments, unit){
    const self = this;
    let cronString = '';
    if(unit == 's'){
      cronString = moments.toString() + ' * * * * *';
    }
    if(unit == 'm'){
      cronString = '0 ' + moments.toString() + ' * * * *';
    }
    if(unit == 'h'){
      cronString = '0 0 ' + moments.toString() + ' * * *';
    }
    self.eventHandler.emit('cronStringGeneration', self.constructor.name, {rmId:self.rm.id, cronString:cronString});
    return cronString;
  }



};
module.exports = JobManager;
