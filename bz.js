var debugResponse = require('debug')('bz:response');
var debugRequest = require('debug')('bz:request');

/**
Constant for the login entrypoint.
*/
var LOGIN = '/login';

/**
Errors related to the socket timeout.
*/
var TIMEOUT_ERRORS = ['ETIMEDOUT', 'ESOCKETTIMEDOUT'];

function extractField(id, callback) {
  if (typeof id === 'function') {
    callback = id;
    id = undefined;
  }

  return function(err, response) {
    if (err) return callback(err);

    // default behavior is to use the first id when the caller does not provide
    // one.
    if (id === undefined) {
      id = Object.keys(response)[0];
    }

    callback(null, response[id]);
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

var BugzillaClient = function(options) {
  options = options || {};

  this.username = options.username;
  this.password = options.password;
  this.timeout = options.timeout || 0;
  this.apiUrl = options.url ||
    (options.test ? "https://bugzilla-dev.allizom.org/rest/"
                  : "https://bugzilla.mozilla.org/rest/");
  this.apiUrl = this.apiUrl.replace(/\/$/, "");
}

BugzillaClient.prototype = {

  /**
  Authentication details for given user.

  Example:

      { id: 1222, token: 'xxxx' }

  @type {Object}
  */
  _auth: null,

  /**
  In the REST API we first login to acquire a token which is then used to make 
  requests. See: http://bzr.mozilla.org/bmo/4.2/view/head:/Bugzilla/WebService/Server/REST.pm#L556

  This method can be used publicly but is designed for internal consumption for
  ease of use.

  @param {Function} callback [Error err, String token].
  */
  login: function(callback) {
    if (!this.username || !this.password) {
      throw new Error('missing or invalid .username or .password');
    }

    var params = {
      login: this.username,
      password: this.password
    };

    var handleLogin = function handleLogin(err, response) {
      if (err) return callback(err);
      this._auth = response;
      callback(null, response);
    }.bind(this);

    this.APIRequest('/login', 'GET', handleLogin, null, null, params);
  },

  getBug : function(id, params, callback) {
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
  },

  searchBugs : function(params, callback) {
    this.APIRequest('/bug', 'GET', callback, 'bugs', null, params);
  },

  updateBug : loginRequired(function(id, bug, callback) {
    this.APIRequest('/bug/' + id, 'PUT', callback, 'bugs', bug);
  }),

  createBug : loginRequired(function(bug, callback) {
    this.APIRequest('/bug', 'POST', callback, 'id', bug);
  }),

  bugComments : function(id, callback) {
    this.APIRequest('/bug/' + id + '/comment', 'GET', callback, 'comments');
  },

  addComment : function(id, comment, callback) {
    this.APIRequest('/bug/' + id + '/comment', 'POST', callback, 'ref', comment);
  },

  bugHistory : function(id, callback) {
    this.APIRequest('/bug/' + id + '/history', 'GET', callback, 'history');
  },

  bugFlags : function(id, callback) {
    this.APIRequest('/bug/' + id + '/flag', 'GET', callback, 'flags');
  },

  /**
   * Finds all attachments for a given bug #
   * http://www.bugzilla.org/docs/tip/en/html/api/Bugzilla/WebService/Bug.html#attachments
   *
   * @param {Number} id of bug.
   * @param {Function} [Error, Array<Attachment>].
   */
  bugAttachments : function(id, callback) {
    this.APIRequest(
      '/bug/' + id + '/attachment',
      'GET',
      extractField(id, callback),
      'bugs'
    );
  },

  /**
   * Returns history for a given flag.
   * @see https://wiki.mozilla.org/BMO/REST/review#flag_activity
   * @param {Integer} id The flag id.
   * @param {Function} callback
   */
  flagActivity: function(id, callback) {
    this.APIRequest('/review/flag_activity/' + id, 'GET', callback);
  },

  createAttachment : function(id, attachment, callback) {
    this.APIRequest(
      '/bug/' + id + '/attachment',
      'POST',
      extractField(callback),
      'attachments',
      attachment
    );
  },

  getAttachment : function(id, callback) {
    this.APIRequest(
      '/bug/attachment/' + id,
      'GET',
      extractField(callback),
      'attachments'
    );
  },

  updateAttachment : function(id, attachment, callback) {
    this.APIRequest('/bug/attachment/' + id, 'PUT', callback, 'ok', attachment);
  },

  searchUsers : function(match, callback) {
    this.APIRequest('/user', 'GET', callback, 'users', null, {match: match});
  },

  getUser : function(id, callback) {
    this.APIRequest('/user/' + id, 'GET', callback);
  },

  getSuggestedReviewers: function(id, callback) {
    // BMO- specific extension to get suggested reviewers for a given bug
    // http://bzr.mozilla.org/bmo/4.2/view/head:/extensions/Review/lib/WebService.pm#L102
    this.APIRequest('/review/suggestions/' + id, 'GET', callback);
  },

  getConfiguration : function(params, callback) {
    if (!callback) {
       callback = params;
       params = {};
    }
    this.APIRequest('/configuration', 'GET', callback, null, null, params);
  },

  APIRequest: function(path, method, callback, field, body, params) {
    debugRequest(path, method, body, params);
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

    // so we can pass the arguments inside of another function
    var args = Array.prototype.slice.call(arguments);

    this.login(function(err) {
      if (err) return callback(err);
      this._APIRequest.apply(this, args);
    }.bind(this));
  },

  _APIRequest : function(path, method, callback, field, body, params) {
    var url = this.apiUrl + path;
    if (this._auth) {
      params = params || {};
      // bugzilla authentication token
      params.Bugzilla_token = this._auth.token;
    }

    if(params)
      url += "?" + this.urlEncode(params);

    body = JSON.stringify(body);

    try {
      XMLHttpRequest = require("sdk/net/xhr").XMLHttpRequest; // Addon SDK
    }
    catch(e) {}

    var that = this;
    if(typeof XMLHttpRequest != "undefined") {
      // in a browser
      var req = new XMLHttpRequest();
      req.open(method, url, true);
      req.setRequestHeader("Accept", "application/json");
      if (method.toUpperCase() !== "GET") {
        req.setRequestHeader("Content-type", "application/json");
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
        that.handleResponse('error', req, callback);
      };
      req.send(body);
    }
    else {
      // node 'request' package
      var request = require("request");
      var requestParams = {
        uri: url,
        method: method,
        body: body,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      };
      if (this.timeout > 0)
        requestParams.timeout = this.timeout;
      request(requestParams, function (err, resp, body) {
        that.handleResponse(err, {
            status: resp && resp.statusCode,
            responseText: body
          }, callback, field);
        }
      );
    }
  },

  handleResponse : function(err, response, callback, field) {
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

    // successful http respnse but an error
    // XXX: this seems like a bug in the api.
    if (parsedBody && parsedBody.error) {
      requestSuccessful = false;
    }

    if (!requestSuccessful) {
      return callback(new Error(
        'HTTP status ' + response.status + '\n' +
        (parsedBody && parsedBody.message) ? parsedBody.message : ''
      ));
    }

    debugResponse('raw json', parsedBody);
    callback(null, (field) ? parsedBody[field] : parsedBody);
  },

  urlEncode : function(params) {
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

exports.createClient = function(options) {
  return new BugzillaClient(options);
}
