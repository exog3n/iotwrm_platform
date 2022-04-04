
const { CommunicationInterface } = require('../models');
const { APIError } = require('../helpers');
async function createCommunicationInterface(request, response, next) {
  try {
    const newCommunicationInterface = await CommunicationInterface.createCommunicationInterface(new CommunicationInterface(request.body));
    console.log("created",newCommunicationInterface)
    return response.status(201).json(newCommunicationInterface);
  } catch (err) {
    return next(err);
  }
}
async function readCommunicationInterface(request, response, next) {
  const { id } = request.params;
  try {
    const communicationInterface = await CommunicationInterface.readCommunicationInterface(id);
    console.log("readed",newCommunicationInterface)
    return response.json(communicationInterface);
  } catch (err) {
    return next(err);
  }
}
async function updateCommunicationInterface(request, response, next) {
  const { id } = request.params;
  try {
    const communicationInterface = await CommunicationInterface.updateCommunicationInterface(id, request.body);
    console.log("updated",newCommunicationInterface)
    return response.json(communicationInterface);
  } catch (err) {
    return next(err);
  }
}
async function deleteCommunicationInterface(request, response, next) {
  const { id } = request.params;
  try {
    const deleteMsg = await CommunicationInterface.deleteCommunicationInterface(id);
    console.log("deleted",newCommunicationInterface)
    return response.json(deleteMsg);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  createCommunicationInterface,
  readCommunicationInterface,
  updateCommunicationInterface,
  deleteCommunicationInterface
};
