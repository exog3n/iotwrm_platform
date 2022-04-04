// app imports
const { Recipe } = require('../models');
const { APIError, parseSkipLimit } = require('../helpers');


async function readRecipes(request, response, next) {
  let skip = parseSkipLimit(request.query.skip) || 0;
  let limit = parseSkipLimit(request.query.limit, 1000) || 1000;
  if (skip instanceof APIError) {
    return next(skip);
  } else if (limit instanceof APIError) {
    return next(limit);
  }

  try {
    const recipes = await Recipe.readRecipes({}, {}, skip, limit);
    return response.json(recipes);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  readRecipes
};
