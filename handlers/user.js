
const { User } = require('../models');
const { APIError } = require('../helpers');
async function createUser(request, response, next) {
  try {
    const newUser = await User.createUser(new User(request.body));
    console.log("created",newUser)
    return response.status(201).json(newUser);
  } catch (err) {
    return next(err);
  }
}
async function readUser(request, response, next) {
  const { id } = request.params;
  try {
    const user = await User.readUser(id);
    console.log("readed",newUser)
    return response.json(user);
  } catch (err) {
    return next(err);
  }
}
async function updateUser(request, response, next) {
  const { id } = request.params;
  try {
    const user = await User.updateUser(id, request.body);
    console.log("updated",newUser)
    return response.json(user);
  } catch (err) {
    return next(err);
  }
}
async function deleteUser(request, response, next) {
  const { id } = request.params;
  try {
    const deleteMsg = await User.deleteUser(id);
    console.log("deleted",newUser)
    return response.json(deleteMsg);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  createUser,
  readUser,
  updateUser,
  deleteUser
};
