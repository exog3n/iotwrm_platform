
const { Device } = require('../models');
const { APIError } = require('../helpers');
async function createDevice(request, response, next) {
  try {
    const newDevice = await Device.createDevice(new Device(request.body));
    console.log("created",newDevice)
    return response.status(201).json(newDevice);
  } catch (err) {
    return next(err);
  }
}
async function readDevice(request, response, next) {
  const { id } = request.params;
  try {
    const device = await Device.readDevice(id);
    console.log("readed",newDevice)
    return response.json(device);
  } catch (err) {
    return next(err);
  }
}
async function updateDevice(request, response, next) {
  const { id } = request.params;
  try {
    const device = await Device.updateDevice(id, request.body);
    console.log("updated",newDevice)
    return response.json(device);
  } catch (err) {
    return next(err);
  }
}
async function deleteDevice(request, response, next) {
  const { id } = request.params;
  try {
    const deleteMsg = await Device.deleteDevice(id);
    console.log("deleted",newDevice)
    return response.json(deleteMsg);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  createDevice,
  readDevice,
  updateDevice,
  deleteDevice
};
