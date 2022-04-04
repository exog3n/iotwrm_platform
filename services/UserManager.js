const { UserModel } = require('../models');
const bcrypt = require("bcryptjs");
const jwt = require('jwt-simple');
class UserManager{
  constructor(app, secret, eventHandler) {
    this.app = app;
    this.secret = secret;
    this.eventHandler = eventHandler;
  }

  async findUser(username){
    let results = await UserModel.readUsers({username:username});
    if(results.length === 1){
      return results[0];
    } else if (results.length > 1){
      console.error('ERROR', 'More than one user with same username.')
    }
  }

  async loadUser(id){
    return await UserModel.readUser(id);
  }

  async createUser(username, password, email){
    const self = this;
    let id = '_u_' + Math.random().toString(36).substr(2, 9);
    let newHashedPass = bcrypt.hashSync(password, bcrypt.genSaltSync(10), null);
    let token = jwt.encode({id:id}, this.secret);
    let params = {id:id, username:username, password:newHashedPass, token:token, email:email, role:'user'};
    let user = await UserModel.createUser(new UserModel(params));
    self.eventHandler.emit('newUser', self.constructor.name, {userId:id});
    delete user.password;
    return user;
  }

  validateLogin(user, password){
    return bcrypt.compareSync(password, user.password);
  }

  async authenticate(username, password, done) {
    const self = this;
    const user = await this.findUser(username);
    if (!user){
      self.eventHandler.emit('userNotExist', self.constructor.name, {username:username});
      return done(null, false, { message: "User does not exist" });
    }
    if (!this.validateLogin(user, password)){
      self.eventHandler.emit('invalidUserPass', self.constructor.name, {userId:user.id});
      return done(null, false, { message: "Password is not valid." });
    }
    self.eventHandler.emit('userAuthenticated', self.constructor.name, {userId:user.id});
    delete user.password;
    return done(null, user);
  }

  async assignRmToUser(uid, rmId){
    let user = await this.loadUser(uid);
    user.rm_ids.push(rmId);
    return await UserModel.updateUser(uid, {rm_ids:user.rm_ids});
  }

  async detouchRmToUser(uid, rmId){
    let user = await this.loadUser(uid);
    const index = user.rm_ids.indexOf(rmId);
    if (index > -1) {
      user.rm_ids.splice(index, 1);
    }
    return await UserModel.updateUser(uid, {rm_ids:user.rm_ids});
  }




};
module.exports = UserManager;
