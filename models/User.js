
const mongoose = require('mongoose');
const { APIError } = require('../helpers');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  id: String,
  username: String,
  password: String,
  token: String,
  email: String,
  role: { type: String, enum: ['admin', 'user', 'moderator'] }, 
  rm_ids: [String]
},{collection: 'users' });

userSchema.statics = {
  async createUser(newUser) {
    const duplicate = await this.findOne({ username: newUser.username });
    if (duplicate) {
      console.error('User Already Exists');
      return { message: "User already exist" }
    }
    const user = await newUser.save();
    return user.toObject();
  },
  async deleteUser(id) {
    const deleted = await this.findOneAndRemove({ id });
    if (!deleted) {
      throw new APIError(404, 'User Not Found', `No user '${id}' found.`);
    }
    return deleted.toObject();
  },
  async readUser(id) {
    const user = await this.findOne({ id });

    if (!user) {
      throw new APIError(404, 'User Not Found', `No user '${id}' found.`);
    }
    return user.toObject();
  },
  async readUsers(query, fields, skip, limit) {
    const users = await this.find(query, fields)
      .skip(skip)
      .limit(limit)
      .sort({ id: 1 })
      .exec();
    if (!users.length) {
      return [];
    }
    return users.map(user => user.toObject());
  },
  async updateUser(id, userUpdate) {
    const user = await this.findOneAndUpdate({ id }, userUpdate, {
      new: true
    });
    if (!user) {
      throw new APIError(404, 'User Not Found', `No user '${id}' found.`);
    }
    return user.toObject();
  }
};
if (!userSchema.options.toObject) userSchema.options.toObject = {};
userSchema.options.toObject.transform = (doc, ret) => {
  const transformed = ret;
  delete transformed._id;
  delete transformed.__v;
  return transformed;
};
userSchema.index({ id: 1, number: 1 }, { unique: true });

module.exports = mongoose.model('User', userSchema);
