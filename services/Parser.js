const bodyParser = require("body-parser");
const axios = require('axios');
class Parser{
  constructor(app) {
    this.app = app;
  }

  async request(url, callback) {
    const self = this;
    return await axios.get(url)
      .then(response => {
        return response.data;
      })
      .catch(error => {
        console.log('error on request');
      });
  }

  parse(url, callback) {
    const self = this;
    self.app.use(bodyParser.json())
    console.log('parse url',url)
    try{
      self.app.post(url, (req, res) => {
        console.log('parsing...')
        callback(req);
        res.status(200).end();
      })
    }catch(e){console.log(e)}
  }


};
module.exports = Parser;
