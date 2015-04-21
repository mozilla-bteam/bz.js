'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.get = get;
exports.post = post;
var request = undefined,
    isJetpack = undefined;

try {
  request = require('sdk/request');
} catch (err) {
  request = require('request');
}

function get(options, callback) {
  var contentType = options.contentType || 'application/json';
  if (isJetpack) {
    var _req = Request({
      url: options.url,
      contentType: contentType,
      onComplete: function onComplete(response) {
        if (response.statusText !== 'OK') {
          callback([response.status, response.statusText]);
        }
        callback(null, response.text);
      }
    });
    _req.get();
  } else {
    request.get(options.url, function (err, response, body) {
      if (err) callback(err);
      callback(null, body);
    });
  }
}

function post(options, callback) {
  if (isJetpack) {
    var _req = Request({
      url: options.url,
      content: options.content, // strings need to be encoded.
      onComplete: function onComplete(response) {
        if (response.statusText !== 'OK') {
          callback([response.status, response.statusText]);
        }
        callback(null, response.text);
      }
    });
    _req.post();
  } else {
    request.post({
      url: options.url,
      form: options.content
    }, function (err, response, body) {
      if (err) callback(err);
      callback(null, body);
    });
  }
}