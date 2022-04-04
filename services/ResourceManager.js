
const Point = require('../classes/point.class');
class ResourceManager {
  constructor(orchestrator, id, networkId, device_map_id, points, recipe_id, auto, systemConfig, operationSetup, eventHandler) {
    this.o = orchestrator;
    this.id = id;
    this.networkId = networkId;
    this.deviceMap = device_map_id;
    this.points = points || [];
    this.recipe = recipe_id;
    this.auto = auto;
    this.systemConfig = systemConfig;
    this.operationSetup = operationSetup;
    this.eventHandler = eventHandler;
  }
  setSystemConfig(config) {
    this.systemConfig = config;
  }
  getSystemConfig() {
    return this.systemConfig;
  }
  setOperationSetup(setup) {
    this.operationSetup = setup;
  }
  getOperationSetup() {
    return this.operationSetup;
  }
  async loadData() {
    this.deviceMap = (typeof this.deviceMap == 'string') ? await this.o.loadDeviceMap(this.deviceMap) : {};
    this.recipe = await this.o.loadRecipe(this.recipe);
    this.points = await this.loadPoints(this.points);
    return await Promise.all([this.deviceMap].concat([this.recipe].concat(this.points)))
  }

  async loadPoints(pids){
    return await Promise.all(pids.map(async (pid)=>{
      return await Point.load(pid);
    }))
  }

  async createPoints(nodes){
    let points = await Promise.all(nodes.map(async (pointModelParams) => {
      return await Point.generate(pointModelParams);
    }));
    this.setPoints(points);
    this.o.updateResourceManager(this.id, {point_ids:this.points.map(p => p.id)});
    return this.getPoints(points.map(p => p.id));
  }
  async updatePoints(nodes){
    let points = await Promise.all(nodes.map(async (pointModelParams) => {
      const point = await this.getPoint(pointModelParams.id);
      return point.save(pointModelParams);
    }));
    this.setPoints(points);
    return this.getPoints(points.map(p => p.id));
  }
  async deletePoints(pids){
    let points = this.getPoints(pids);
    let deletedIds = await Promise.all(points.map(async (point) => {
      return await point.remove();
    }));
    this.unsetPoints(points);
    this.o.updateResourceManager(this.id, {point_ids:this.points.map(p => p.id)});
    console.log(deletedIds, ' points deleted.')
    return deletedIds.toString() + ' points deleted.';
  }

  getPoint(pid){
    return this.points.find(p => pid === p.id);
  }

  getPoints(pids){
    return this.points.filter(p => pids.includes(p.id));
  }

  setPoints(points){
    points.forEach((point)=>{
      let pid = point.id;
      if(this.getPoint(pid) === undefined){
        this.points.push(point);
      } else {  // update
        let oldPoint = this.getPoint(point.id);
        this.points[this.points.indexOf(oldPoint)] = point;
      }
    })
  }

  unsetPoints(points){
    points.forEach((point) => {
      let pid = point.id;
      this.points.splice(this.points.indexOf(point), 1);
    })
  }




};
module.exports = ResourceManager;
