var recordToGeoJSON = require('./record_to_geojson');

function Processor (tokenator, featureService, fulcrumClient, form, req, res, next) {
  this.tokenator = tokenator;
  this.featureService = featureService;
  this.fulcrumClient = fulcrumClient;
  this.form = form;
  this.req = req;
  this.res = res;
  this.next = next;

  this.recentlyCreated = {};

  this._setGlobalIdKey();
  this._setObjectIdKey();
  this.processRequest();
};

Processor.prototype._setGlobalIdKey = function () {
  for (var i = 0; i < this.form.elements.length; i++) {
    var element = this.form.elements[i];

    if (element.data_name === 'globalid') {
      this.globalIdKey = element.key;
      break;
    }
  }
};

Processor.prototype._setObjectIdKey = function () {
  for (var i = 0; i < this.form.elements.length; i++) {
    var element = this.form.elements[i];

    if (element.data_name === 'objectid') {
      this.objectIdKey = element.key;
      break;
    }
  }
};

Processor.prototype.isWebhookRequest = function () {
  if (this.req.body && this.req.body.type) {
    return true;
  }

  return false;
};

Processor.prototype.processCreate = function () {
  var me = this;

  this.tokenator.getToken(function (error, token) {
    if (error) {
      return this.sendError(error);
    }

    me.featureService.token = token;

    var record = me.req.body.data;
    var geojson = recordToGeoJSON(me.form, record);

    me.featureService.add(geojson, function (error, created) {
      if (error) {
        return me.sendError(error);
      }

      // Stash this id in a "recently created" object. We are about to send an
      // update for this record to add the globalid and objectid. We'll assume
      // we can ignore the next update webhook request for this globalid since
      // it's just this update.
      me.recentlyCreated[created.globalId] = 1;

      record.form_values[me.globalIdKey] = created.globalId.toString();
      record.form_values[me.objectIdKey] = created.objectId.toString();

      me.fulcrumClient.records.update(record.id, record, function (error, resp) {
        if (error) {
          return me.sendError(error);
        }

        me.sendResponse();
      });
    });
  });
};

Processor.prototype.processUpdate = function () {
  var me = this;

  this.tokenator.getToken(function (error, token) {
    if (error) {
      return this.sendError(error);
    }

    me.featureService.token = token;

    var record = me.req.body.data;
    var geojson = recordToGeoJSON(me.form, record);

    // This is just the update where we added the objectid and globalid to this
    // record. Just ignore this one and move along.
    if (geojson.properties.globalid && me.recentlyCreated[geojson.properties.globalid]) {
      delete me.recentlyCreated[geojson.properties.globalid];
      return me.sendResponse();
    }

    me.featureService.update(geojson, function (error, updated) {
      if (error) {
        return me.sendError(error);
      }

      me.sendResponse();
    });
  });
};

Processor.prototype.processDelete = function () {
  var me = this;

  this.tokenator.getToken(function (error, token) {
    if (error) {
      return this.sendError(error);
    }

    me.featureService.token = token;

    var record = me.req.body.data;
    var geojson = recordToGeoJSON(me.form, record);

    if (!geojson.properties.objectid) {
      return me.sendResponse();
    }

    me.featureService.delete(geojson.properties.objectid, function (error) {
      if (error) {
        return me.sendError(error);
      }

      me.sendResponse();
    });
  });
};

Processor.prototype.processRequest = function () {
  if (!this.isWebhookRequest()) {
    return this.next();
  }

  switch (this.req.body.type) {
    case 'record.create':
      this.processCreate();
      break;
    case 'record.update':
      this.processUpdate();
      break;
    case 'record.delete':
      this.processDelete();
      break;
    default:
      this.sendResponse();
  }
};

Processor.prototype.sendResponse = function () {
  this.res.send('ok');
};

Processor.prototype.sendError = function (error) {
  console.log('Error: ', error);
  this.res.sendStatus(500);
};

module.exports = Processor;
