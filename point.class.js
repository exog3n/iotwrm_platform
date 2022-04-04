const { PointModel } = require('../models');
class Point{
  constructor(id, type, title, location, root, parent, childrens, mcIds) {
    this.id = id;
    this.type = type;
    this.title = title;
    this.location = location || {};
    this.root = root || {};
    this.parent = parent || {};
    this.childrens = childrens || [];
    this.mcIds = mcIds || [];
  }
  static async load (id) {
    const {type, title, location,root_point_id,parent_id,children_ids, mc_ids} = await PointModel.readPoint(id);
    return new Point(id, type, title,location,root_point_id,parent_id,children_ids, mc_ids); // TODO see what to do with these ids
  }
  static async generate (params) {
    let pointModel = await PointModel.createPoint(new PointModel(params));
    const {id, type, title, location,root_point_id,parent_id,children_ids, mc_ids} = pointModel;
    return new Point(id, type, title,location,root_point_id,parent_id,children_ids, mc_ids);
  }
  async save (params) {
    const { id } = params;
    const {type, title, location,root_point_id,parent_id,children_ids, mc_ids} = await PointModel.updatePoint(id, params);
    return new Point(id, type, title,location,root_point_id,parent_id,children_ids, mc_ids);
  }
  async remove () {
    await PointModel.deletePoint(this.id);
    return this.id;
  }

  static async DBfind (query, fields) {
    return await PointModel.readPoints(query, {}, 0, 1000).then(
      (data) => {
        return Object.values(data).map((d) => {
          let {id, type, title, location,root_point_id,parent_id,children_ids} = d;
          return new Point(id, type, title, location,root_point_id,parent_id,children_ids);
        })
      }
    );
  }

  flatten(){
    let flat = {};
    Object.assign(flat, this);
    flat.root = (flat.root) ? flat.root.id : '';
    flat.parent = (flat.root) ? flat.root.id : '';
    flat.childrens = flat.childrens.map(c => c.id);
    return flat;
  }

};
module.exports = Point;
