
const ModelAccessor = require('./services/ModelAccessor');

const data_file = process.argv[2];
if(!data_file){
  console.error('No data file specified as script argument.')
}

const {
  connectToDatabase
} = require('./config');

connectToDatabase();

var fs = require('fs');

fs.readFile(__dirname + '/data/default.json', (err, data) => {
  ModelAccessor.restoreDB(JSON.parse(data));
  setTimeout(()=>{
    fs.readFile(__dirname + '/' + data_file, (err, data) => {
      ModelAccessor.restoreDB(JSON.parse(data));
      setTimeout(()=>{
        console.log("Your demo data should be loaded now. Please run 'docker-compose restart' on a new terminal.");
        process.exit();
      },2000)
    })
  },3000)
})
