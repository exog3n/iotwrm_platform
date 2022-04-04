
const mongoose = require('mongoose');
const { APIError } = require('../helpers');
const Schema = mongoose.Schema;

const recipeSchema = new Schema({
  id: String,
  title: String,
  task: { type: String, enum: ['supply', 'irrigation', 'fertilizing', 'reporting'] },
  taxonomy: { type: String, enum: ['olive', 'grapes'] },
  models: [Object], 
},{collection: 'recipes' });

recipeSchema.statics = {
  async createRecipe(newRecipe) {
    newRecipe.id = '_rec_' + Math.random().toString(36).substr(2, 9);
    let recipe = {};
    recipe = await newRecipe.save();
    return recipe.toObject();
  },
  async deleteRecipe(id) {
    const deleted = await this.findOneAndRemove({ id });
    if (!deleted) {
      throw new APIError(404, 'Recipe Not Found', `No recipe '${id}' found.`);
    }
    return deleted.toObject();
  },
  async readRecipe(id) {
    const recipe = await this.findOne({ id });

    if (!recipe) {
      return new APIError(404, 'Recipe Not Found', `No recipe '${id}' found.`);
    }
    return recipe.toObject();
  },
  async readRecipes(query, fields, skip, limit) {
    const recipes = await this.find(query, fields)
      .skip(skip)
      .limit(limit)
      .sort({ id: 1 })
      .exec();
    if (!recipes.length) {
      return [];
    }
    return recipes.map(recipe => recipe.toObject());
  },
  async updateRecipe(id, recipeUpdate) {
    const recipe = await this.findOneAndUpdate({ id }, recipeUpdate, {
      new: true
    });
    if (!recipe) {
      throw new APIError(404, 'Recipe Not Found', `No recipe '${id}' found.`);
    }
    return recipe.toObject();
  }
};
if (!recipeSchema.options.toObject) recipeSchema.options.toObject = {};
recipeSchema.options.toObject.transform = (doc, ret) => {
  const transformed = ret;
  delete transformed._id;
  delete transformed.__v;
  return transformed;
};
recipeSchema.index({ id: 1, number: 1 }, { unique: true });

module.exports = mongoose.model('Recipe', recipeSchema);
