const { APP_NAME, PORT } = require('./config');
const express = require('express');
const app = require('./app');



app.listen(PORT, () => {
  console.log(`${APP_NAME} API is listening on port ${PORT}...`);
});



const http = require('http');

app['server'] = http.createServer((req, res) => {

});

app.server.listen(10000, function() {
  console.log(`${APP_NAME} development front app is listening on port 10000... Go to http://lora.hmu.gr:10000/`);
})
