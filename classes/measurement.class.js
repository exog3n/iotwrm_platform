const { MeasurementModel } = require('../models');
class Measurement{
  constructor(id, value, timestamp, device, payload_id, data_specification) {
    this.id = id;
    this.value = value;
    this.timestamp = timestamp;
    this.device = device || {};
    this.payload_id = payload_id;
    this.data_specification = data_specification || null;
  }
  static async DBread (id) {
    const measurement = await MeasurementModel.readMeasurement(id);
    return measurement;
  }
  static async generate (params, device) {
    let {id, value, timestamp, device_id, payload_id, data_specification} = await MeasurementModel.createMeasurement(new MeasurementModel(params));
    return new Measurement(id, value, timestamp, device || device_id, payload_id, data_specification);
  }
  async DBupdate (params) {
    const { id } = params;
    await MeasurementModel.updateMeasurement(params);
  }
  async DBdelete (params) {
    const { id } = params;
    await MeasurementModel.deleteMeasurement(id);
  }

  static async find (query) {
    let measurementModels = await MeasurementModel.readMeasurements(query, {}, 0, 1000);
    return Object.values(measurementModels).map((measurementModel) => {
      const {id, value, timestamp, device_id, payload_id, data_specification} = measurementModel;
      return new Measurement(id, value, timestamp, device_id, payload_id, data_specification);
    })
  }


};
module.exports = Measurement;
