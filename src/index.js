const XMLHttpRequest = require('./xhr').XMLHttpRequest;

/**
Constant for the login entrypoint.
*/
const LOGIN = '/login';

/**
Errors related to the socket timeout.
*/
const TIMEOUT_ERRORS = ['ETIMEDOUT', 'ESOCKETTIMEDOUT'];

function extractField(id, callback) {
  if (typeof id === 'function') {
    callback = id;
    id = undefined;
  }

  return function(err, response) {
    if (err) return callback(err);

    if (response) {
      // default behavior is to use the first id when the caller does not provide one.
      if (id === undefined) {
        id = Object.keys(response)[0];
      }
      callback(null, response[id]);
    }
    else {
      throw "Error:, no response in extractField";
    }
  };
}

/**
Function decorator which will attempt to login to bugzilla
with the current credentials prior to making the actual api call.

    Bugzilla.prototype.method = login(function(param, param) {
    });

@param {Function} method to decorate.
@return {Function} decorated method.
*/
function loginRequired(method) {
  // we assume this is a valid bugilla instance.
  return function() {
    // remember |this| is a bugzilla instance

    // args for the decorated method
    var args = Array.prototype.slice.call(arguments),
        // we need the callback so we can pass login related errors.
        callback = args[args.length - 1];

    this.login(function(err) {
      if (err) return callback(err);

      // we are now logged in so the method can run!
      method.apply(this, args);
    }.bind(this));
  };
}

export var BugzillaClient = class {

  constructor(options) {
    options = options || {};

    this.username = options.username;
    this.password = options.password;
    this.timeout = options.timeout || 0;
    this.api_key = options.api_key || null;

    if (options.test) {
      throw new Error('options.test is deprecated please specify the url directly');
    }

    this.apiUrl = options.url || 'https://bugzilla.mozilla.org/rest/';
    this.apiUrl = this.apiUrl.replace(/\/$/, "");

    this._auth = null;
  }
  /**
  Authentication details for given user.

  Example:

      { id: 1222, token: 'xxxx' }

  @type {Object}
  */


  /**
  In the REST API we first login to acquire a token which is then used to make
  requests. See: http://bzr.mozilla.org/bmo/4.2/view/head:/Bugzilla/WebService/Server/REST.pm#L556

  This method can be used publicly but is designed for internal consumption for
  ease of use.

  @param {Function} callback [Error err, String token].
  */
  login (callback) {

    if (this._auth) {
      callback(null, this._auth);
    }

    if (!this.username || !this.password) {
      throw new Error('missing or invalid .username or .password');
    }

    var params = {
      login: this.username,
      password: this.password
    };

    var handleLogin = function handleLogin(err, response) {
      if (err) return callback(err);
      if (response.result) {
        this._auth = response.result
      }
      else {
        this._auth = response;
      }
      callback(null, response);
    }.bind(this);

    this.APIRequest('/login', 'GET', handleLogin, null, null, params);
  }

  getBug (id, params, callback) {
    if (!callback) {
       callback = params;
       params = {};
    }

    this.APIRequest(
      '/bug/' + id,
      'GET',
      extractField(callback),
      'bugs',
      null,
      params
    );
  }

  searchBugs (params, callback) {
    this.APIRequest('/bug', 'GET', callback, 'bugs', null, params);
  }

  updateBug (id, bug, callback) {
    this.APIRequest('/bug/' + id, 'PUT', callback, 'bugs', bug);
  }

  createBug (bug, callback) {
    this.APIRequest('/bug', 'POST', callback, 'id', bug);
  }

  bugComments (id, callback) {
    var _callback = function(e, r) {
      if (e) throw e;
      var _bug_comments = r[id];
      if (typeof _bug_comments['comments'] !== 'undefined') {
        // bugzilla 5 :(
        _bug_comments = _bug_comments.comments;
      }
      callback(null, _bug_comments);
    }

    this.APIRequest(
      '/bug/' + id + '/comment',
      'GET',
      _callback,
      'bugs'
    );
  }

  addComment (id, comment, callback) {
    this.APIRequest(
      '/bug/' + id + '/comment',
      'POST',
      callback,
      null,
      comment
    );
  }

  bugHistory (id, callback) {
    this.APIRequest(
      '/bug/' + id + '/history',
      'GET',
      callback,
      'bugs'
    );
  }

  /**
   * Finds all attachments for a given bug #
   * http://www.bugzilla.org/docs/tip/en/html/api/Bugzilla/WebService/Bug.html#attachments
   *
   * @param {Number} id of bug.
   * @param {Function} [Error, Array<Attachment>].
   */
  bugAttachments (id, callback) {
    this.APIRequest(
      '/bug/' + id + '/attachment',
      'GET',
      extractField(id, callback),
      'bugs'
    );
  }

  createAttachment (id, attachment, callback) {
    this.APIRequest(
      '/bug/' + id + '/attachment',
      'POST',
      extractField(callback),
      'ids',
      attachment
    );
  }

  getAttachment (id, callback) {
    this.APIRequest(
      '/bug/attachment/' + id,
      'GET',
      extractField(callback),
      'attachments'
    );
  }

  updateAttachment (id, attachment, callback) {
    this.APIRequest('/bug/attachment/' + id, 'PUT', callback, 'ok', attachment);
  }

  searchUsers (match, callback) {
    this.APIRequest('/user', 'GET', callback, 'users', null, {match: match});
  }

  getUser (id, callback) {
    this.APIRequest(
      '/user/' + id,
      'GET',
      extractField(callback),
      'users'
    );
  }

  getSuggestedReviewers (id, callback) {
    // BMO- specific extension to get suggested reviewers for a given bug
    // http://bzr.mozilla.org/bmo/4.2/view/head:/extensions/Review/lib/WebService.pm#L102
    this.APIRequest('/review/suggestions/' + id, 'GET', callback);
  }

  /*
    XXX this call is provided for convenience to people scripting against prod bugzillq
    THERE IS NO EQUIVALENT REST CALL IN TIP, so this should not be tested against tip, hence
    the hard-coded url.
  */
  getConfiguration (params, callback) {
    if (!callback) {
       callback = params;
       params = {};
    }

    // this.APIRequest('/configuration', 'GET', callback, null, null, params);
    // UGLAY temp fix until /configuration is implemented,
    // see https://bugzilla.mozilla.org/show_bug.cgi?id=924405#c11:
    let that = this;

    var req = new XMLHttpRequest();
    req.open('GET', 'https://api-dev.bugzilla.mozilla.org/latest/configuration', true);
    req.setRequestHeader("Accept", "application/json");
    req.onreadystatechange = function (event) {
      if (req.readyState == 4 && req.status != 0) {
        that.handleResponse(null, req, callback);
      }
    };
    req.timeout = this.timeout;
    req.ontimeout = function (event) {
      that.handleResponse('timeout', req, callback);
    };
    req.onerror = function (event) {
      that.handleResponse('error', req, callback);
    };
    req.send();
  }

  getProducts (product) {
    var _this = this;
    return new Promise(function(resolve, reject) {
      if( product === "selectable" || product === "enterable" || product === "accessible" ) {
        _this.APIRequest(
          '/product?type=' + product,
          'GET',
          function(err, products) {
            if(err) {
              return reject(err);
            } else {
              return resolve(products);
            }
          }
        );
      } else {
        _this.APIRequest(
          '/product/' + product,
          'GET',
          function(err, products) {
            if(err) {
              return reject(err);
            } else {
              return resolve(products);
            }
          }
        );
      }
    });
  }

  getProduct (product) {
    var _this = this;
    return new Promise(function(resolve, reject) {
      _this.APIRequest(
        '/product/' + product,
        'GET',
        function(err, product) {
            if(err) {
              return reject(err);
            } else {
              return resolve(product);
            }
          }
      );
    });
  }

  APIRequest (path, method, callback, field, body, params) {
    if (
      // if we are doing the login
      path === LOGIN ||
      // if we are already authed
      this._auth ||
      // or we are missing auth data
      !this.password || !this.username
    ) {
      // skip automatic authentication
      return this._APIRequest.apply(this, arguments);
    }

    let args = [].slice.call(arguments);

    this.login(function(err) {
      if (err) return callback(err);
      this._APIRequest.apply(this, args);
    }.bind(this));
  }

  _APIRequest (path, method, callback, field, body, params) {
    let url = this.apiUrl + path;

    params = params || {};

    if(this.api_key) { params.api_key = this.api_key; }

    if (this._auth) {
      params.token = this._auth.token;
    }
    else if (this.username && this.password) {
      params.login = this.username;
      params.password = this.password;
    }

    if (params && Object.keys(params).length > 0) {
      url += "?" + this.urlEncode(params);
    }

    body = JSON.stringify(body);

    let that = this;

    var req = new XMLHttpRequest();
    req.open(method, url, true);
    req.setRequestHeader("Accept", "application/json");
    if (method.toUpperCase() !== "GET") {
      req.setRequestHeader("Content-Type", "application/json");
    }
    req.onreadystatechange = function (event) {
      if (req.readyState == 4 && req.status != 0) {
        that.handleResponse(null, req, callback, field);
      }
    };
    req.timeout = this.timeout;
    req.ontimeout = function (event) {
      that.handleResponse('timeout', req, callback);
    };
    req.onerror = function (event) {
      that.handleResponse(event, req, callback);
    };
    req.send(body);
  }

  handleResponse (err, response, callback, field) {
    // detect timeout errors
    if (err && err.code && TIMEOUT_ERRORS.indexOf(err.code) !== -1) {
      return callback(new Error('timeout'));
    }

    // handle generic errors
    if (err) return callback(err);

    // anything in 200 status range is a success
    var requestSuccessful = response.status > 199 && response.status < 300;

    // even in the case of an unsuccessful request we may have json data.
    var parsedBody;

    try {
      parsedBody = JSON.parse(response.responseText);
    } catch (e) {
      // XXX: might want to handle this better in the request success case?
      if (requestSuccessful) {
        return callback(
          new Error('response was not valid json: ' + response.responseText)
        );
      }
    }

    // detect if we're running Bugzilla 5.0
    if (typeof parsedBody['result'] !== 'undefined') {
      parsedBody = parsedBody['result'];
    }

    // successful http respnse but an error
    // XXX: this seems like a bug in the api.
    if (parsedBody && parsedBody.error) {
      requestSuccessful = false;
    }

    if (!requestSuccessful) {
      return callback(new Error(
        'HTTP status ' + response.status + '\n' +
        // note intentional use of != instead of !==
        (parsedBody && parsedBody.message) ? parsedBody.message : ''
      ));
    }

    callback(null, (field) ? parsedBody[field] : parsedBody);
  }

  urlEncode (params) {
    var url = [];
    for(var param in params) {
      var values = params[param];
      if(!values.forEach)
        values = [values];
      // expand any arrays
      values.forEach(function(value) {
         url.push(encodeURIComponent(param) + "=" +
           encodeURIComponent(value));
      });
    }
    return url.join("&");
  }
}

export function createClient(options) {
  return new BugzillaClient(options);
}
