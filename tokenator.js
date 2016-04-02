var request = require('request');

function Tokenator(options) {
  var options = options || {};

  if (!options.agsRoot) {
    throw 'options.agsRoot must be provided'
  }

  this.agsRoot = options.agsRoot;
  this.username = options.username || '';
  this.password = options.password || '';

  this._currentToken = null;
  this._currentTokenExpires = null;
}

Tokenator.prototype.currentTokenExpired = function () {
  if (this._currentToken && this._currentTokenExpires > new Date()) {
    return false;
  } else {
    return true;
  }
};

Tokenator.prototype.getToken = function (callback) {
  var me = this;

  if (this._currentToken && !this.currentTokenExpired()) {
    return callback(null, this._currentToken);
  }

  var url = this.agsRoot + 'tokens/generateToken';
  var formData = {
    username: this.username,
    password: this.password,
    expiration: 60,
    f: 'json'
  };

  request.post({url: url, form: formData, json: true}, function (error, response, body) {
    if (error) {
      return callback(error);
    }

    me._currentToken = body.token;
    me._currentTokenExpires = new Date(body.expires);

    callback(null, me._currentToken);
  });
};

module.exports = Tokenator;
