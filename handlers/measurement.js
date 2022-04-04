
const { Measurement } = require('../models');
const { APIError } = require('../helpers');
async function createMeasurement(request, response, next) {
  try {
    const newMeasurement = await Measurement.createMeasurement(new Measurement(request.body));
    console.log("created",newMeasurement)
    return response.status(201).json(newMeasurement);
  } catch (err) {
    return next(err);
  }
}
async function readMeasurement(request, response, next) {
  const { id } = request.params;
  try {
    const measurement = await Measurement.readMeasurement(id);
    console.log("readed",newMeasurement)
    return response.json(measurement);
  } catch (err) {
    return next(err);
  }
}
async function updateMeasurement(request, response, next) {
  const { id } = request.params;
  try {
    const measurement = await Measurement.updateMeasurement(id, request.body);
    console.log("updated",newMeasurement)
    return response.json(measurement);
  } catch (err) {
    return next(err);
  }
}
async function deleteMeasurement(request, response, next) {
  const { id } = request.params;
  try {
    const deleteMsg = await Measurement.deleteMeasurement(id);
    console.log("deleted",newMeasurement)
    return response.json(deleteMsg);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  createMeasurement,
  readMeasurement,
  updateMeasurement,
  deleteMeasurement
};
