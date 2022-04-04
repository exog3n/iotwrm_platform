
const dotenv = require('dotenv');
const express = require('express');
const path = require('path');
const systemOptions = require('./data/system.json');
const secret = process.env.SECRET;
const EventHandler = require('./services/EventHandler');
const UserManager = require('./services/UserManager');

Promise = require('bluebird');
const {
  connectToDatabase,
  globalResponseHeaders
} = require('./config');
const {
  errorHandler
} = require('./handlers');
dotenv.config();
const app = express();
const {
  bodyParserHandler,
  globalErrorHandler,
  fourOhFourHandler,
  fourOhFiveHandler
} = errorHandler;
connectToDatabase();
app.use(express.urlencoded({
  extended: true
}));
app.use(express.json({
  type: '*/*'
}));
app.use(bodyParserHandler);


console.log('NODE_ENV', process.env.NODE_ENV);
const {
  Orchestrator
} = require('./services');

const eventHandler = new EventHandler(app, systemOptions.system_config);
const userManager = new UserManager(app, secret, eventHandler);
app['cloud'] = new Orchestrator(app, eventHandler, userManager, systemOptions, secret);
app.cloud.init();
app.use(globalResponseHeaders);



const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
app.use(session({
   secret: secret
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(
  {
     usernameField: "username",
     passwordField: "password"
  },
  (username,password, done) => userManager.authenticate(username, password, done)
));

passport.serializeUser(async (user, done) => {
  done(null, user.id);
});
passport.deserializeUser(async (id, done) => {
  const user = await userManager.loadUser(id);
  done(null, user);
});
app.post(
   '/api/users/login',
   passport.authenticate("local"),
   (req, res) => {
     res.json(req.user);
   }
);
app.post(
   '/api/users/register',
   async (req, res) => {
     const user = await userManager.createUser(req.body.username, req.body.password, req.body.email);
     res.json(user);
   }
);
app.get('*', fourOhFourHandler);
app.all('*', fourOhFiveHandler);

app.use(globalErrorHandler);
module.exports = app;
