
const { Recipe } = require('../models');
const { APIError } = require('../helpers');
async function createRecipe(request, response, next) {
  try {
    const newRecipe = await Recipe.createRecipe(new Recipe(request.body));
    console.log("created",newRecipe)
    return response.status(201).json(newRecipe);
  } catch (err) {
    return next(err);
  }
}
async function readRecipe(request, response, next) {
  const { id } = request.params;
  try {
    const recipe = await Recipe.readRecipe(id);
    console.log("readed",newRecipe)
    return response.json(recipe);
  } catch (err) {
    return next(err);
  }
}
async function updateRecipe(request, response, next) {
  const { id } = request.params;
  try {
    const recipe = await Recipe.updateRecipe(id, request.body);
    console.log("updated",newRecipe)
    return response.json(recipe);
  } catch (err) {
    return next(err);
  }
}
async function deleteRecipe(request, response, next) {
  const { id } = request.params;
  try {
    const deleteMsg = await Recipe.deleteRecipe(id);
    console.log("deleted",newRecipe)
    return response.json(deleteMsg);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  createRecipe,
  readRecipe,
  updateRecipe,
  deleteRecipe
};
