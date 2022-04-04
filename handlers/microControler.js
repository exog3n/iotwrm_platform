
const { MicroControler } = require('../models');
const { APIError } = require('../helpers');
async function createMicroControler(request, response, next) {
  try {
    const newMicroControler = await MicroControler.createMicroControler(new MicroControler(request.body));
    console.log("created",newMicroControler)
    return response.status(201).json(newMicroControler);
  } catch (err) {
    return next(err);
  }
}
async function readMicroControler(request, response, next) {
  const { id } = request.params;
  try {
    const MicroControler = await MicroControler.readMicroControler(id);
    console.log("readed",newMicroControler)
    return response.json(MicroControler);
  } catch (err) {
    return next(err);
  }
}
async function updateMicroControler(request, response, next) {
  const { id } = request.params;
  try {
    const MicroControler = await MicroControler.updateMicroControler(id, request.body);
    console.log("updated",newMicroControler)
    return response.json(MicroControler);
  } catch (err) {
    return next(err);
  }
}
async function deleteMicroControler(request, response, next) {
  const { id } = request.params;
  try {
    const deleteMsg = await MicroControler.deleteMicroControler(id);
    console.log("deleted",newMicroControler)
    return response.json(deleteMsg);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  createMicroControler,
  readMicroControler,
  updateMicroControler,
  deleteMicroControler
};
