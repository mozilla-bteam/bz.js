let request, isJetpack = false, _loader = require;

try {
  request = _loader('sdk/request');
  isJetpack = true;
} catch(err) {
  request = _loader('request');
}

export function get(options, callback) {
  let contentType = options.contentType || 'application/json';
  if (isJetpack) {
    let _req = Request({
      url: options.url,
      contentType: contentType,
      onComplete: function (response) {
        if (response.statusText !== 'OK') {
          callback([response.status, response.statusText]);
        }
        callback(null, response.text);
      }
    });
    _req.get();
  }
  else {
    request.get(options.url, function(err, response, body) {
      if (err) callback(err);
      callback(null, body);
    });
  }
}

export function post(options, callback) {
  if (isJetpack) {
    let _req = Request({
      url: options.url,
      content: options.content, // strings need to be encoded.
      onComplete: function (response) {
        if (response.statusText !== 'OK') {
          callback([response.status, response.statusText]);
        }
        callback(null, response.text);
      }
    });
    _req.post();
  }
  else {
    request.post({
      url: options.url, 
      form: options.content
    }, function(err, response, body) {
      if (err) callback(err);
      callback(null, body);
    });
  }
}
