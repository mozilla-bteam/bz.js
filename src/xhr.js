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
          options.callback([response.status, response.statusText]);
        }
        let parsed = JSON.parse(response.text);
        options.callback(null, parsed);
      }
    });
    _req.get();
  }
  else {
    request.get(options.url, function(err, response, body) {
      if (err) callback(err);
      let parsed = JSON.parse(body);
      options.callback(null, parsed);
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
          options.callback([response.status, response.statusText]);
        }
        let parsed = JSON.parse(response.text);
        options.callback(null, parsed);
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
      let parsed = JSON.parse(body);
      options.callback(null, parsed);
    });
  }
}
