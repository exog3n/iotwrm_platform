
const { DeviceMap } = require('../models');
const { APIError } = require('../helpers');
async function createDeviceMap(request, response, next) {
  try {
    const newDeviceMap = await DeviceMap.createDeviceMap(new DeviceMap(request.body));
    console.log("created",newDeviceMap)
    return response.status(201).json(newDeviceMap);
  } catch (err) {
    return next(err);
  }
}
async function readDeviceMap(request, response, next) {
  const { id } = request.params;
  try {
    const deviceMap = await DeviceMap.readDeviceMap(id);
    console.log("readed",newDeviceMap)
    return response.json(deviceMap);
  } catch (err) {
    return next(err);
  }
}
async function updateDeviceMap(request, response, next) {
  const { id } = request.params;
  try {
    const deviceMap = await DeviceMap.updateDeviceMap(id, request.body);
    console.log("updated",newDeviceMap)
    return response.json(deviceMap);
  } catch (err) {
    return next(err);
  }
}
async function deleteDeviceMap(request, response, next) {
  const { id } = request.params;
  try {
    const deleteMsg = await DeviceMap.deleteDeviceMap(id);
    console.log("deleted",newDeviceMap)
    return response.json(deleteMsg);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  createDeviceMap,
  readDeviceMap,
  updateDeviceMap,
  deleteDeviceMap
};
