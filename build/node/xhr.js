'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.get = get;
exports.post = post;
var request = undefined,
    isJetpack = false,
    _loader = require;

try {
  request = _loader('sdk/request');
  isJetpack = true;
} catch (err) {
  request = _loader('request');
}

function get(options, callback) {
  var contentType = options.contentType || 'application/json';
  if (isJetpack) {
    var _req = Request({
      url: options.url,
      contentType: contentType,
      onComplete: function onComplete(response) {
        if (response.statusText !== 'OK') {
          options.callback([response.status, response.statusText]);
        }
        var parsed = JSON.parse(response.text);
        options.callback(null, parsed);
      }
    });
    _req.get();
  } else {
    request.get(options.url, function (err, response, body) {
      if (err) callback(err);
      var parsed = JSON.parse(body);
      options.callback(null, parsed);
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
          options.callback([response.status, response.statusText]);
        }
        var parsed = JSON.parse(response.text);
        options.callback(null, parsed);
      }
    });
    _req.post();
  } else {
    request.post({
      url: options.url,
      form: options.content
    }, function (err, response, body) {
      if (err) callback(err);
      var parsed = JSON.parse(body);
      options.callback(null, parsed);
    });
  }
}