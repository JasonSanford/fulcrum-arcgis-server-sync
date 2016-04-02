var express = require('express');
var bodyParser = require('body-parser')
var FeatureService = require('arcgis-featureservice');
var Fulcrum = require('fulcrum-app');

var fulcrumConfig = require('./config/fulcrum');
var arcgisConfig = require('./config/arcgis');

var Tokenator = require('./tokenator');
var Processor = require('./processor');

var app = express();
var jsonParser = bodyParser.json()

var tokenator = new Tokenator({
  username: arcgisConfig.username,
  password: arcgisConfig.password,
  agsRoot: arcgisConfig.root
});

var featureService = new FeatureService({
  url: arcgisConfig.featureServiceUrl,
  idField: arcgisConfig.idField
});

var fulcrumClient = new Fulcrum({
  api_key: fulcrumConfig.apiKey
  // TODO: Set to live api
  //url: 'http://localhost:3000/api/v2/'
});

fulcrumClient.forms.find(fulcrumConfig.formId, function (error, resp) {
  if (error) {
    throw error;
  }

  var form = resp.form;
  app.post('/', jsonParser, function (req, res, next) {
    var processor = new Processor(tokenator, featureService, fulcrumClient, form, req, res, next);
  });

  var port = process.env.PORT || 5000;

  app.listen(port, function () {
    console.log('Listening on port ' + port);
  });
});
