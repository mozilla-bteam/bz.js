(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// this file is the entrypoint for building a browser file with browserify

"use strict";

var bz = window.bz = require("./index");

},{"./index":2}],2:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

exports.createClient = createClient;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var XMLHttpRequest = require('./xhr').XMLHttpRequest;

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

  return function (err, response) {
    if (err) return callback(err);

    if (response) {
      // default behavior is to use the first id when the caller does not provide one.
      if (id === undefined) {
        id = Object.keys(response)[0];
      }
      callback(null, response[id]);
    } else {
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
  return function () {
    // we assume this is a valid bugilla instance.

    // remember |this| is a bugzilla instance

    // args for the decorated method
    var args = Array.prototype.slice.call(arguments),

    // we need the callback so we can pass login related errors.
    callback = args[args.length - 1];

    this.login((function (err) {
      if (err) return callback(err);

      // we are now logged in so the method can run!
      method.apply(this, args);
    }).bind(this));
  };
}

var BugzillaClient = (function () {
  function BugzillaClient(options) {
    _classCallCheck(this, BugzillaClient);

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

  _createClass(BugzillaClient, [{
    key: 'login',
    value: function login(callback) {

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

      var handleLogin = (function handleLogin(err, response) {
        if (err) return callback(err);
        if (response.result) {
          this._auth = response.result;
        } else {
          this._auth = response;
        }
        callback(null, response);
      }).bind(this);

      this.APIRequest('/login', 'GET', handleLogin, null, null, params);
    }
  }, {
    key: 'getBug',
    value: function getBug(id, params, callback) {
      if (!callback) {
        callback = params;
        params = {};
      }

      this.APIRequest('/bug/' + id, 'GET', extractField(callback), 'bugs', null, params);
    }
  }, {
    key: 'searchBugs',
    value: function searchBugs(params, callback) {
      this.APIRequest('/bug', 'GET', callback, 'bugs', null, params);
    }
  }, {
    key: 'updateBug',
    value: function updateBug(id, bug, callback) {
      this.APIRequest('/bug/' + id, 'PUT', callback, 'bugs', bug);
    }
  }, {
    key: 'createBug',
    value: function createBug(bug, callback) {
      this.APIRequest('/bug', 'POST', callback, 'id', bug);
    }
  }, {
    key: 'bugComments',
    value: function bugComments(id, callback) {
      var _callback = function _callback(e, r) {
        if (e) throw e;
        var _bug_comments = r[id];
        if (typeof _bug_comments['comments'] !== 'undefined') {
          // bugzilla 5 :(
          _bug_comments = _bug_comments.comments;
        }
        callback(null, _bug_comments);
      };

      this.APIRequest('/bug/' + id + '/comment', 'GET', _callback, 'bugs');
    }
  }, {
    key: 'addComment',
    value: function addComment(id, comment, callback) {
      this.APIRequest('/bug/' + id + '/comment', 'POST', callback, null, comment);
    }
  }, {
    key: 'bugHistory',
    value: function bugHistory(id, callback) {
      this.APIRequest('/bug/' + id + '/history', 'GET', callback, 'bugs');
    }

    /**
     * Finds all attachments for a given bug #
     * http://www.bugzilla.org/docs/tip/en/html/api/Bugzilla/WebService/Bug.html#attachments
     *
     * @param {Number} id of bug.
     * @param {Function} [Error, Array<Attachment>].
     */
  }, {
    key: 'bugAttachments',
    value: function bugAttachments(id, callback) {
      this.APIRequest('/bug/' + id + '/attachment', 'GET', extractField(id, callback), 'bugs');
    }
  }, {
    key: 'createAttachment',
    value: function createAttachment(id, attachment, callback) {
      this.APIRequest('/bug/' + id + '/attachment', 'POST', extractField(callback), 'ids', attachment);
    }
  }, {
    key: 'getAttachment',
    value: function getAttachment(id, callback) {
      this.APIRequest('/bug/attachment/' + id, 'GET', extractField(callback), 'attachments');
    }
  }, {
    key: 'updateAttachment',
    value: function updateAttachment(id, attachment, callback) {
      this.APIRequest('/bug/attachment/' + id, 'PUT', callback, 'ok', attachment);
    }
  }, {
    key: 'searchUsers',
    value: function searchUsers(match, callback) {
      this.APIRequest('/user', 'GET', callback, 'users', null, { match: match });
    }
  }, {
    key: 'getUser',
    value: function getUser(id, callback) {
      this.APIRequest('/user/' + id, 'GET', extractField(callback), 'users');
    }
  }, {
    key: 'getSuggestedReviewers',
    value: function getSuggestedReviewers(id, callback) {
      // BMO- specific extension to get suggested reviewers for a given bug
      // http://bzr.mozilla.org/bmo/4.2/view/head:/extensions/Review/lib/WebService.pm#L102
      this.APIRequest('/review/suggestions/' + id, 'GET', callback);
    }

    /*
      XXX this call is provided for convenience to people scripting against prod bugzillq
      THERE IS NO EQUIVALENT REST CALL IN TIP, so this should not be tested against tip, hence
      the hard-coded url.
    */
  }, {
    key: 'getConfiguration',
    value: function getConfiguration(params, callback) {
      if (!callback) {
        callback = params;
        params = {};
      }

      // this.APIRequest('/configuration', 'GET', callback, null, null, params);
      // UGLAY temp fix until /configuration is implemented,
      // see https://bugzilla.mozilla.org/show_bug.cgi?id=924405#c11:
      var that = this;

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
  }, {
    key: 'APIRequest',
    value: function APIRequest(path, method, callback, field, body, params) {
      if (
      // if we are doing the login
      path === LOGIN ||
      // if we are already authed
      this._auth ||
      // or we are missing auth data
      !this.password || !this.username) {
        // skip automatic authentication
        return this._APIRequest.apply(this, arguments);
      }

      var args = [].slice.call(arguments);

      this.login((function (err) {
        if (err) return callback(err);
        this._APIRequest.apply(this, args);
      }).bind(this));
    }
  }, {
    key: '_APIRequest',
    value: function _APIRequest(path, method, callback, field, body, params) {
      var url = this.apiUrl + path;

      params = params || {};

      if (this.api_key) {
        params.api_key = this.api_key;
      }

      if (this._auth) {
        params.token = this._auth.token;
      } else if (this.username && this.password) {
        params.username = this.username;
        params.password = this.password;
      }

      if (params && Object.keys(params).length > 0) {
        url += "?" + this.urlEncode(params);
      }

      body = JSON.stringify(body);

      var that = this;

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
  }, {
    key: 'handleResponse',
    value: function handleResponse(err, response, callback, field) {
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
          return callback(new Error('response was not valid json: ' + response.responseText));
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
        return callback(new Error('HTTP status ' + response.status + '\n' + (
        // note intentional use of != instead of !==
        parsedBody && parsedBody.message) ? parsedBody.message : ''));
      }

      callback(null, field ? parsedBody[field] : parsedBody);
    }
  }, {
    key: 'urlEncode',
    value: function urlEncode(params) {
      var url = [];
      for (var param in params) {
        var values = params[param];
        if (!values.forEach) values = [values];
        // expand any arrays
        values.forEach(function (value) {
          url.push(encodeURIComponent(param) + "=" + encodeURIComponent(value));
        });
      }
      return url.join("&");
    }
  }]);

  return BugzillaClient;
})();

exports.BugzillaClient = BugzillaClient;

function createClient(options) {
  return new BugzillaClient(options);
}

},{"./xhr":3}],3:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
var XMLHttpRequest = null;

exports.XMLHttpRequest = XMLHttpRequest;
if (typeof window === 'undefined') {
  // we're not in a browser?
  var _loader = require;
  try {
    exports.XMLHttpRequest = XMLHttpRequest = _loader('sdk/net/xhr').XMLHttpRequest;
  } catch (e) {
    exports.XMLHttpRequest = XMLHttpRequest = _loader("xmlhttprequest").XMLHttpRequest;
  }
} else if (typeof window !== 'undefined' && typeof window.XMLHttpRequest !== 'undefined') {
  exports.XMLHttpRequest = XMLHttpRequest = window.XMLHttpRequest;
} else {
  throw "No window, WAT.";
}

},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvamVmZi9jb2RlL2RldnRvb2xzL2J6LmpzL3NyYy9iei5qcyIsIi9Vc2Vycy9qZWZmL2NvZGUvZGV2dG9vbHMvYnouanMvc3JjL2luZGV4LmpzIiwiL1VzZXJzL2plZmYvY29kZS9kZXZ0b29scy9iei5qcy9zcmMveGhyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7OztBQ0VBLElBQUksRUFBRSxHQUFHLE1BQU0sQ0FBQyxFQUFFLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDOzs7Ozs7Ozs7OztRQ2dheEIsWUFBWSxHQUFaLFlBQVk7Ozs7QUFsYTVCLElBQU0sY0FBYyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxjQUFjLENBQUM7Ozs7O0FBS3ZELElBQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQzs7Ozs7QUFLdkIsSUFBTSxjQUFjLEdBQUcsQ0FBQyxXQUFXLEVBQUUsaUJBQWlCLENBQUMsQ0FBQzs7QUFFeEQsU0FBUyxZQUFZLENBQUMsRUFBRSxFQUFFLFFBQVEsRUFBRTtBQUNsQyxNQUFJLE9BQU8sRUFBRSxLQUFLLFVBQVUsRUFBRTtBQUM1QixZQUFRLEdBQUcsRUFBRSxDQUFDO0FBQ2QsTUFBRSxHQUFHLFNBQVMsQ0FBQztHQUNoQjs7QUFFRCxTQUFPLFVBQVMsR0FBRyxFQUFFLFFBQVEsRUFBRTtBQUM3QixRQUFJLEdBQUcsRUFBRSxPQUFPLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQzs7QUFFOUIsUUFBSSxRQUFRLEVBQUU7O0FBRVosVUFBSSxFQUFFLEtBQUssU0FBUyxFQUFFO0FBQ3BCLFVBQUUsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO09BQy9CO0FBQ0QsY0FBUSxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsRUFBRSxDQUFDLENB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LFFBQU0saUJBQWlCLENBQUE7Q0FDeEIiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLy8gdGhpcyBmaWxlIGlzIHRoZSBlbnRyeXBvaW50IGZvciBidWlsZGluZyBhIGJyb3dzZXIgZmlsZSB3aXRoIGJyb3dzZXJpZnlcblxudmFyIGJ6ID0gd2luZG93LmJ6ID0gcmVxdWlyZShcIi4vaW5kZXhcIik7IiwiY29uc3QgWE1MSHR0cFJlcXVlc3QgPSByZXF1aXJlKCcuL3hocicpLlhNTEh0dHBSZXF1ZXN0O1xuXG4vKipcbkNvbnN0YW50IGZvciB0aGUgbG9naW4gZW50cnlwb2ludC5cbiovXG5jb25zdCBMT0dJTiA9ICcvbG9naW4nO1xuXG4vKipcbkVycm9ycyByZWxhdGVkIHRvIHRoZSBzb2NrZXQgdGltZW91dC5cbiovXG5jb25zdCBUSU1FT1VUX0VSUk9SUyA9IFsnRVRJTUVET1VUJywgJ0VTT0NLRVRUSU1FRE9VVCddO1xuXG5mdW5jdGlvbiBleHRyYWN0RmllbGQoaWQsIGNhbGxiYWNrKSB7XG4gIGlmICh0eXBlb2YgaWQgPT09ICdmdW5jdGlvbicpIHtcbiAgICBjYWxsYmFjayA9IGlkO1xuICAgIGlkID0gdW5kZWZpbmVkO1xuICB9XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKGVyciwgcmVzcG9uc2UpIHtcbiAgICBpZiAoZXJyKSByZXR1cm4gY2FsbGJhY2soZXJyKTtcblxuICAgIGlmIChyZXNwb25zZSkge1xuICAgICAgLy8gZGVmYXVsdCBiZWhhdmlvciBpcyB0byB1c2UgdGhlIGZpcnN0IGlkIHdoZW4gdGhlIGNhbGxlciBkb2VzIG5vdCBwcm92aWRlIG9uZS5cbiAgICAgIGlmIChpZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlkID0gT2JqZWN0LmtleXMocmVzcG9uc2UpWzBdO1xuICAgICAgfVxuICAgICAgY2FsbGJhY2sobnVsbCwgcmVzcG9uc2VbaWRdKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB0aHJvdyBcIkVycm9yOiwgbm8gcmVzcG9uc2UgaW4gZXh0cmFjdEZpZWxkXCI7XG4gICAgfVxuICB9O1xufVxuXG4vKipcbkZ1bmN0aW9uIGRlY29yYXRvciB3aGljaCB3aWxsIGF0dGVtcHQgdG8gbG9naW4gdG8gYnVnemlsbGFcbndpdGggdGhlIGN1cnJlbnQgY3JlZGVudGlhbHMgcHJpb3IgdG8gbWFraW5nIHRoZSBhY3R1YWwgYXBpIGNhbGwuXG5cbiAgICBCdWd6aWxsYS5wcm90b3R5cGUubWV0aG9kID0gbG9naW4oZnVuY3Rpb24ocGFyYW0sIHBhcmFtKSB7XG4gICAgfSk7XG5cbkBwYXJhbSB7RnVuY3Rpb259IG1ldGhvZCB0byBkZWNvcmF0ZS5cbkByZXR1cm4ge0Z1bmN0aW9ufSBkZWNvcmF0ZWQgbWV0aG9kLlxuKi9cbmZ1bmN0aW9uIGxvZ2luUmVxdWlyZWQobWV0aG9kKSB7XG4gIC8vIHdlIGFzc3VtZSB0aGlzIGlzIGEgdmFsaWQgYnVnaWxsYSBpbnN0YW5jZS5cbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgIC8vIHJlbWVtYmVyIHx0aGlzfCBpcyBhIGJ1Z3ppbGxhIGluc3RhbmNlXG5cbiAgICAvLyBhcmdzIGZvciB0aGUgZGVjb3JhdGVkIG1ldGhvZFxuICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKSxcbiAgICAgICAgLy8gd2UgbmVlZCB0aGUgY2FsbGJhY2sgc28gd2UgY2FuIHBhc3MgbG9naW4gcmVsYXRlZCBlcnJvcnMuXG4gICAgICAgIGNhbGxiYWNrID0gYXJnc1thcmdzLmxlbmd0aCAtIDFdO1xuXG4gICAgdGhpcy5sb2dpbihmdW5jdGlvbihlcnIpIHtcbiAgICAgIGlmIChlcnIpIHJldHVybiBjYWxsYmFjayhlcnIpO1xuXG4gICAgICAvLyB3ZSBhcmUgbm93IGxvZ2dlZCBpbiBzbyB0aGUgbWV0aG9kIGNhbiBydW4hXG4gICAgICBtZXRob2QuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfS5iaW5kKHRoaXMpKTtcbiAgfTtcbn1cblxuZXhwb3J0IHZhciBCdWd6aWxsYUNsaWVudCA9IGNsYXNzIHtcblxuICBjb25zdHJ1Y3RvcihvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgICB0aGlzLnVzZXJuYW1lID0gb3B0aW9ucy51c2VybmFtZTtcbiAgICB0aGlzLnBhc3N3b3JkID0gb3B0aW9ucy5wYXNzd29yZDtcbiAgICB0aGlzLnRpbWVvdXQgPSBvcHRpb25zLnRpbWVvdXQgfHwgMDtcbiAgICB0aGlzLmFwaV9rZXkgPSBvcHRpb25zLmFwaV9rZXkgfHwgbnVsbDtcblxuICAgIGlmIChvcHRpb25zLnRlc3QpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignb3B0aW9ucy50ZXN0IGlzIGRlcHJlY2F0ZWQgcGxlYXNlIHNwZWNpZnkgdGhlIHVybCBkaXJlY3RseScpO1xuICAgIH1cblxuICAgIHRoaXMuYXBpVXJsID0gb3B0aW9ucy51cmwgfHwgJ2h0dHBzOi8vYnVnemlsbGEubW96aWxsYS5vcmcvcmVzdC8nO1xuICAgIHRoaXMuYXBpVXJsID0gdGhpcy5hcGlVcmwucmVwbGFjZSgvXFwvJC8sIFwiXCIpO1xuXG4gICAgdGhpcy5fYXV0aCA9IG51bGw7XG4gIH1cbiAgLyoqXG4gIEF1dGhlbnRpY2F0aW9uIGRldGFpbHMgZm9yIGdpdmVuIHVzZXIuXG5cbiAgRXhhbXBsZTpcblxuICAgICAgeyBpZDogMTIyMiwgdG9rZW46ICd4eHh4JyB9XG5cbiAgQHR5cGUge09iamVjdH1cbiAgKi9cblxuXG4gIC8qKlxuICBJbiB0aGUgUkVTVCBBUEkgd2UgZmlyc3QgbG9naW4gdG8gYWNxdWlyZSBhIHRva2VuIHdoaWNoIGlzIHRoZW4gdXNlZCB0byBtYWtlXG4gIHJlcXVlc3RzLiBTZWU6IGh0dHA6Ly9ienIubW96aWxsYS5vcmcvYm1vLzQuMi92aWV3L2hlYWQ6L0J1Z3ppbGxhL1dlYlNlcnZpY2UvU2VydmVyL1JFU1QucG0jTDU1NlxuXG4gIFRoaXMgbWV0aG9kIGNhbiBiZSB1c2VkIHB1YmxpY2x5IGJ1dCBpcyBkZXNpZ25lZCBmb3IgaW50ZXJuYWwgY29uc3VtcHRpb24gZm9yXG4gIGVhc2Ugb2YgdXNlLlxuXG4gIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIFtFcnJvciBlcnIsIFN0cmluZyB0b2tlbl0uXG4gICovXG4gIGxvZ2luIChjYWxsYmFjaykge1xuXG4gICAgaWYgKHRoaXMuX2F1dGgpIHtcbiAgICAgIGNhbGxiYWNrKG51bGwsIHRoaXMuX2F1dGgpO1xuICAgIH1cblxuICAgIGlmICghdGhpcy51c2VybmFtZSB8fCAhdGhpcy5wYXNzd29yZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdtaXNzaW5nIG9yIGludmFsaWQgLnVzZXJuYW1lIG9yIC5wYXNzd29yZCcpO1xuICAgIH1cblxuICAgIHZhciBwYXJhbXMgPSB7XG4gICAgICBsb2dpbjogdGhpcy51c2VybmFtZSxcbiAgICAgIHBhc3N3b3JkOiB0aGlzLnBhc3N3b3JkXG4gICAgfTtcblxuICAgIHZhciBoYW5kbGVMb2dpbiA9IGZ1bmN0aW9uIGhhbmRsZUxvZ2luKGVyciwgcmVzcG9uc2UpIHtcbiAgICAgIGlmIChlcnIpIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICB0aGlzLl9hdXRoID0gcmVzcG9uc2UucmVzdWx0XG4gICAgICB9XG4gICAgICBlbHNlIHtcbiAgICAgICAgdGhpcy5fYXV0aCA9IHJlc3BvbnNlO1xuICAgICAgfVxuICAgICAgY2FsbGJhY2sobnVsbCwgcmVzcG9uc2UpO1xuICAgIH0uYmluZCh0aGlzKTtcblxuICAgIHRoaXMuQVBJUmVxdWVzdCgnL2xvZ2luJywgJ0dFVCcsIGhhbmRsZUxvZ2luLCBudWxsLCBudWxsLCBwYXJhbXMpO1xuICB9XG5cbiAgZ2V0QnVnIChpZCwgcGFyYW1zLCBjYWxsYmFjaykge1xuICAgIGlmICghY2FsbGJhY2spIHtcbiAgICAgICBjYWxsYmFjayA9IHBhcmFtcztcbiAgICAgICBwYXJhbXMgPSB7fTtcbiAgICB9XG5cbiAgICB0aGlzLkFQSVJlcXVlc3QoXG4gICAgICAnL2J1Zy8nICsgaWQsXG4gICAgICAnR0VUJyxcbiAgICAgIGV4dHJhY3RGaWVsZChjYWxsYmFjayksXG4gICAgICAnYnVncycsXG4gICAgICBudWxsLFxuICAgICAgcGFyYW1zXG4gICAgKTtcbiAgfVxuXG4gIHNlYXJjaEJ1Z3MgKHBhcmFtcywgY2FsbGJhY2spIHtcbiAgICB0aGlzLkFQSVJlcXVlc3QoJy9idWcnLCAnR0VUJywgY2FsbGJhY2ssICdidWdzJywgbnVsbCwgcGFyYW1zKTtcbiAgfVxuXG4gIHVwZGF0ZUJ1ZyAoaWQsIGJ1ZywgY2FsbGJhY2spIHtcbiAgICB0aGlzLkFQSVJlcXVlc3QoJy9idWcvJyArIGlkLCAnUFVUJywgY2FsbGJhY2ssICdidWdzJywgYnVnKTtcbiAgfVxuXG4gIGNyZWF0ZUJ1ZyAoYnVnLCBjYWxsYmFjaykge1xuICAgIHRoaXMuQVBJUmVxdWVzdCgnL2J1ZycsICdQT1NUJywgY2FsbGJhY2ssICdpZCcsIGJ1Zyk7XG4gIH1cblxuICBidWdDb21tZW50cyAoaWQsIGNhbGxiYWNrKSB7XG4gICAgdmFyIF9jYWxsYmFjayA9IGZ1bmN0aW9uKGUsIHIpIHtcbiAgICAgIGlmIChlKSB0aHJvdyBlO1xuICAgICAgdmFyIF9idWdfY29tbWVudHMgPSByW2lkXTtcbiAgICAgIGlmICh0eXBlb2YgX2J1Z19jb21tZW50c1snY29tbWVudHMnXSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgLy8gYnVnemlsbGEgNSA6KFxuICAgICAgICBfYnVnX2NvbW1lbnRzID0gX2J1Z19jb21tZW50cy5jb21tZW50cztcbiAgICAgIH1cbiAgICAgIGNhbGxiYWNrKG51bGwsIF9idWdfY29tbWVudHMpO1xuICAgIH1cblxuICAgIHRoaXMuQVBJUmVxdWVzdChcbiAgICAgICcvYnVnLycgKyBpZCArICcvY29tbWVudCcsXG4gICAgICAnR0VUJyxcbiAgICAgIF9jYWxsYmFjayxcbiAgICAgICdidWdzJ1xuICAgICk7XG4gIH1cblxuICBhZGRDb21tZW50IChpZCwgY29tbWVudCwgY2FsbGJhY2spIHtcbiAgICB0aGlzLkFQSVJlcXVlc3QoXG4gICAgICAnL2J1Zy8nICsgaWQgKyAnL2NvbW1lbnQnLFxuICAgICAgJ1BPU1QnLFxuICAgICAgY2FsbGJhY2ssXG4gICAgICBudWxsLFxuICAgICAgY29tbWVudFxuICAgICk7XG4gIH1cblxuICBidWdIaXN0b3J5IChpZCwgY2FsbGJhY2spIHtcbiAgICB0aGlzLkFQSVJlcXVlc3QoXG4gICAgICAnL2J1Zy8nICsgaWQgKyAnL2hpc3RvcnknLFxuICAgICAgJ0dFVCcsXG4gICAgICBjYWxsYmFjayxcbiAgICAgICdidWdzJ1xuICAgICk7XG4gIH1cblxuICAvKipcbiAgICogRmluZHMgYWxsIGF0dGFjaG1lbnRzIGZvciBhIGdpdmVuIGJ1ZyAjXG4gICAqIGh0dHA6Ly93d3cuYnVnemlsbGEub3JnL2RvY3MvdGlwL2VuL2h0bWwvYXBpL0J1Z3ppbGxhL1dlYlNlcnZpY2UvQnVnLmh0bWwjYXR0YWNobWVudHNcbiAgICpcbiAgICogQHBhcmFtIHtOdW1iZXJ9IGlkIG9mIGJ1Zy5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gW0Vycm9yLCBBcnJheTxBdHRhY2htZW50Pl0uXG4gICAqL1xuICBidWdBdHRhY2htZW50cyAoaWQsIGNhbGxiYWNrKSB7XG4gICAgdGhpcy5BUElSZXF1ZXN0KFxuICAgICAgJy9idWcvJyArIGlkICsgJy9hdHRhY2htZW50JyxcbiAgICAgICdHRVQnLFxuICAgICAgZXh0cmFjdEZpZWxkKGlkLCBjYWxsYmFjayksXG4gICAgICAnYnVncydcbiAgICApO1xuICB9XG5cbiAgY3JlYXRlQXR0YWNobWVudCAoaWQsIGF0dGFjaG1lbnQsIGNhbGxiYWNrKSB7XG4gICAgdGhpcy5BUElSZXF1ZXN0KFxuICAgICAgJy9idWcvJyArIGlkICsgJy9hdHRhY2htZW50JyxcbiAgICAgICdQT1NUJyxcbiAgICAgIGV4dHJhY3RGaWVsZChjYWxsYmFjayksXG4gICAgICAnaWRzJyxcbiAgICAgIGF0dGFjaG1lbnRcbiAgICApO1xuICB9XG5cbiAgZ2V0QXR0YWNobWVudCAoaWQsIGNhbGxiYWNrKSB7XG4gICAgdGhpcy5BUElSZXF1ZXN0KFxuICAgICAgJy9idWcvYXR0YWNobWVudC8nICsgaWQsXG4gICAgICAnR0VUJyxcbiAgICAgIGV4dHJhY3RGaWVsZChjYWxsYmFjayksXG4gICAgICAnYXR0YWNobWVudHMnXG4gICAgKTtcbiAgfVxuXG4gIHVwZGF0ZUF0dGFjaG1lbnQgKGlkLCBhdHRhY2htZW50LCBjYWxsYmFjaykge1xuICAgIHRoaXMuQVBJUmVxdWVzdCgnL2J1Zy9hdHRhY2htZW50LycgKyBpZCwgJ1BVVCcsIGNhbGxiYWNrLCAnb2snLCBhdHRhY2htZW50KTtcbiAgfVxuXG4gIHNlYXJjaFVzZXJzIChtYXRjaCwgY2FsbGJhY2spIHtcbiAgICB0aGlzLkFQSVJlcXVlc3QoJy91c2VyJywgJ0dFVCcsIGNhbGxiYWNrLCAndXNlcnMnLCBudWxsLCB7bWF0Y2g6IG1hdGNofSk7XG4gIH1cblxuICBnZXRVc2VyIChpZCwgY2FsbGJhY2spIHtcbiAgICB0aGlzLkFQSVJlcXVlc3QoXG4gICAgICAnL3VzZXIvJyArIGlkLFxuICAgICAgJ0dFVCcsXG4gICAgICBleHRyYWN0RmllbGQoY2FsbGJhY2spLFxuICAgICAgJ3VzZXJzJ1xuICAgICk7XG4gIH1cblxuICBnZXRTdWdnZXN0ZWRSZXZpZXdlcnMgKGlkLCBjYWxsYmFjaykge1xuICAgIC8vIEJNTy0gc3BlY2lmaWMgZXh0ZW5zaW9uIHRvIGdldCBzdWdnZXN0ZWQgcmV2aWV3ZXJzIGZvciBhIGdpdmVuIGJ1Z1xuICAgIC8vIGh0dHA6Ly9ienIubW96aWxsYS5vcmcvYm1vLzQuMi92aWV3L2hlYWQ6L2V4dGVuc2lvbnMvUmV2aWV3L2xpYi9XZWJTZXJ2aWNlLnBtI0wxMDJcbiAgICB0aGlzLkFQSVJlcXVlc3QoJy9yZXZpZXcvc3VnZ2VzdGlvbnMvJyArIGlkLCAnR0VUJywgY2FsbGJhY2spO1xuICB9XG5cbiAgLypcbiAgICBYWFggdGhpcyBjYWxsIGlzIHByb3ZpZGVkIGZvciBjb252ZW5pZW5jZSB0byBwZW9wbGUgc2NyaXB0aW5nIGFnYWluc3QgcHJvZCBidWd6aWxscVxuICAgIFRIRVJFIElTIE5PIEVRVUlWQUxFTlQgUkVTVCBDQUxMIElOIFRJUCwgc28gdGhpcyBzaG91bGQgbm90IGJlIHRlc3RlZCBhZ2FpbnN0IHRpcCwgaGVuY2VcbiAgICB0aGUgaGFyZC1jb2RlZCB1cmwuXG4gICovXG4gIGdldENvbmZpZ3VyYXRpb24gKHBhcmFtcywgY2FsbGJhY2spIHtcbiAgICBpZiAoIWNhbGxiYWNrKSB7XG4gICAgICAgY2FsbGJhY2sgPSBwYXJhbXM7XG4gICAgICAgcGFyYW1zID0ge307XG4gICAgfVxuXG4gICAgLy8gdGhpcy5BUElSZXF1ZXN0KCcvY29uZmlndXJhdGlvbicsICdHRVQnLCBjYWxsYmFjaywgbnVsbCwgbnVsbCwgcGFyYW1zKTtcbiAgICAvLyBVR0xBWSB0ZW1wIGZpeCB1bnRpbCAvY29uZmlndXJhdGlvbiBpcyBpbXBsZW1lbnRlZCxcbiAgICAvLyBzZWUgaHR0cHM6Ly9idWd6aWxsYS5tb3ppbGxhLm9yZy9zaG93X2J1Zy5jZ2k/aWQ9OTI0NDA1I2MxMTpcbiAgICBsZXQgdGhhdCA9IHRoaXM7XG5cbiAgICB2YXIgcmVxID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgcmVxLm9wZW4oJ0dFVCcsICdodHRwczovL2FwaS1kZXYuYnVnemlsbGEubW96aWxsYS5vcmcvbGF0ZXN0L2NvbmZpZ3VyYXRpb24nLCB0cnVlKTtcbiAgICByZXEuc2V0UmVxdWVzdEhlYWRlcihcIkFjY2VwdFwiLCBcImFwcGxpY2F0aW9uL2pzb25cIik7XG4gICAgcmVxLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgaWYgKHJlcS5yZWFkeVN0YXRlID09IDQgJiYgcmVxLnN0YXR1cyAhPSAwKSB7XG4gICAgICAgIHRoYXQuaGFuZGxlUmVzcG9uc2UobnVsbCwgcmVxLCBjYWxsYmFjayk7XG4gICAgICB9XG4gICAgfTtcbiAgICByZXEudGltZW91dCA9IHRoaXMudGltZW91dDtcbiAgICByZXEub250aW1lb3V0ID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICB0aGF0LmhhbmRsZVJlc3BvbnNlKCd0aW1lb3V0JywgcmVxLCBjYWxsYmFjayk7XG4gICAgfTtcbiAgICByZXEub25lcnJvciA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgdGhhdC5oYW5kbGVSZXNwb25zZSgnZXJyb3InLCByZXEsIGNhbGxiYWNrKTtcbiAgICB9O1xuICAgIHJlcS5zZW5kKCk7XG4gIH1cblxuICBBUElSZXF1ZXN0IChwYXRoLCBtZXRob2QsIGNhbGxiYWNrLCBmaWVsZCwgYm9keSwgcGFyYW1zKSB7XG4gICAgaWYgKFxuICAgICAgLy8gaWYgd2UgYXJlIGRvaW5nIHRoZSBsb2dpblxuICAgICAgcGF0aCA9PT0gTE9HSU4gfHxcbiAgICAgIC8vIGlmIHdlIGFyZSBhbHJlYWR5IGF1dGhlZFxuICAgICAgdGhpcy5fYXV0aCB8fFxuICAgICAgLy8gb3Igd2UgYXJlIG1pc3NpbmcgYXV0aCBkYXRhXG4gICAgICAhdGhpcy5wYXNzd29yZCB8fCAhdGhpcy51c2VybmFtZVxuICAgICkge1xuICAgICAgLy8gc2tpcCBhdXRvbWF0aWMgYXV0aGVudGljYXRpb25cbiAgICAgIHJldHVybiB0aGlzLl9BUElSZXF1ZXN0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuXG4gICAgbGV0IGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG5cbiAgICB0aGlzLmxvZ2luKGZ1bmN0aW9uKGVycikge1xuICAgICAgaWYgKGVycikgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICB0aGlzLl9BUElSZXF1ZXN0LmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH0uYmluZCh0aGlzKSk7XG4gIH1cblxuICBfQVBJUmVxdWVzdCAocGF0aCwgbWV0aG9kLCBjYWxsYmFjaywgZmllbGQsIGJvZHksIHBhcmFtcykge1xuICAgIGxldCB1cmwgPSB0aGlzLmFwaVVybCArIHBhdGg7XG5cbiAgICBwYXJhbXMgPSBwYXJhbXMgfHwge307XG5cbiAgICBpZih0aGlzLmFwaV9rZXkpIHsgcGFyYW1zLmFwaV9rZXkgPSB0aGlzLmFwaV9rZXk7IH1cblxuICAgIGlmICh0aGlzLl9hdXRoKSB7XG4gICAgICBwYXJhbXMudG9rZW4gPSB0aGlzLl9hdXRoLnRva2VuO1xuICAgIH1cbiAgICBlbHNlIGlmICh0aGlzLnVzZXJuYW1lICYmIHRoaXMucGFzc3dvcmQpIHtcbiAgICAgIHBhcmFtcy51c2VybmFtZSA9IHRoaXMudXNlcm5hbWU7XG4gICAgICBwYXJhbXMucGFzc3dvcmQgPSB0aGlzLnBhc3N3b3JkO1xuICAgIH1cblxuICAgIGlmIChwYXJhbXMgJiYgT2JqZWN0LmtleXMocGFyYW1zKS5sZW5ndGggPiAwKSB7XG4gICAgICB1cmwgKz0gXCI/XCIgKyB0aGlzLnVybEVuY29kZShwYXJhbXMpO1xuICAgIH1cblxuICAgIGJvZHkgPSBKU09OLnN0cmluZ2lmeShib2R5KTtcblxuICAgIGxldCB0aGF0ID0gdGhpcztcblxuICAgIHZhciByZXEgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICByZXEub3BlbihtZXRob2QsIHVybCwgdHJ1ZSk7XG4gICAgcmVxLnNldFJlcXVlc3RIZWFkZXIoXCJBY2NlcHRcIiwgXCJhcHBsaWNhdGlvbi9qc29uXCIpO1xuICAgIGlmIChtZXRob2QudG9VcHBlckNhc2UoKSAhPT0gXCJHRVRcIikge1xuICAgICAgcmVxLnNldFJlcXVlc3RIZWFkZXIoXCJDb250ZW50LVR5cGVcIiwgXCJhcHBsaWNhdGlvbi9qc29uXCIpO1xuICAgIH1cbiAgICByZXEub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICBpZiAocmVxLnJlYWR5U3RhdGUgPT0gNCAmJiByZXEuc3RhdHVzICE9IDApIHtcbiAgICAgICAgdGhhdC5oYW5kbGVSZXNwb25zZShudWxsLCByZXEsIGNhbGxiYWNrLCBmaWVsZCk7XG4gICAgICB9XG4gICAgfTtcbiAgICByZXEudGltZW91dCA9IHRoaXMudGltZW91dDtcbiAgICByZXEub250aW1lb3V0ID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICB0aGF0LmhhbmRsZVJlc3BvbnNlKCd0aW1lb3V0JywgcmVxLCBjYWxsYmFjayk7XG4gICAgfTtcbiAgICByZXEub25lcnJvciA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgdGhhdC5oYW5kbGVSZXNwb25zZShldmVudCwgcmVxLCBjYWxsYmFjayk7XG4gICAgfTtcbiAgICByZXEuc2VuZChib2R5KTtcbiAgfVxuXG4gIGhhbmRsZVJlc3BvbnNlIChlcnIsIHJlc3BvbnNlLCBjYWxsYmFjaywgZmllbGQpIHtcbiAgICAvLyBkZXRlY3QgdGltZW91dCBlcnJvcnNcbiAgICBpZiAoZXJyICYmIGVyci5jb2RlICYmIFRJTUVPVVRfRVJST1JTLmluZGV4T2YoZXJyLmNvZGUpICE9PSAtMSkge1xuICAgICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcigndGltZW91dCcpKTtcbiAgICB9XG5cbiAgICAvLyBoYW5kbGUgZ2VuZXJpYyBlcnJvcnNcbiAgICBpZiAoZXJyKSByZXR1cm4gY2FsbGJhY2soZXJyKTtcblxuICAgIC8vIGFueXRoaW5nIGluIDIwMCBzdGF0dXMgcmFuZ2UgaXMgYSBzdWNjZXNzXG4gICAgdmFyIHJlcXVlc3RTdWNjZXNzZnVsID0gcmVzcG9uc2Uuc3RhdHVzID4gMTk5ICYmIHJlc3BvbnNlLnN0YXR1cyA8IDMwMDtcblxuICAgIC8vIGV2ZW4gaW4gdGhlIGNhc2Ugb2YgYW4gdW5zdWNjZXNzZnVsIHJlcXVlc3Qgd2UgbWF5IGhhdmUganNvbiBkYXRhLlxuICAgIHZhciBwYXJzZWRCb2R5O1xuXG4gICAgdHJ5IHtcbiAgICAgIHBhcnNlZEJvZHkgPSBKU09OLnBhcnNlKHJlc3BvbnNlLnJlc3BvbnNlVGV4dCk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgLy8gWFhYOiBtaWdodCB3YW50IHRvIGhhbmRsZSB0aGlzIGJldHRlciBpbiB0aGUgcmVxdWVzdCBzdWNjZXNzIGNhc2U/XG4gICAgICBpZiAocmVxdWVzdFN1Y2Nlc3NmdWwpIHtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKFxuICAgICAgICAgIG5ldyBFcnJvcigncmVzcG9uc2Ugd2FzIG5vdCB2YWxpZCBqc29uOiAnICsgcmVzcG9uc2UucmVzcG9uc2VUZXh0KVxuICAgICAgICApO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIGRldGVjdCBpZiB3ZSdyZSBydW5uaW5nIEJ1Z3ppbGxhIDUuMFxuICAgIGlmICh0eXBlb2YgcGFyc2VkQm9keVsncmVzdWx0J10gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICBwYXJzZWRCb2R5ID0gcGFyc2VkQm9keVsncmVzdWx0J107XG4gICAgfVxuXG4gICAgLy8gc3VjY2Vzc2Z1bCBodHRwIHJlc3Buc2UgYnV0IGFuIGVycm9yXG4gICAgLy8gWFhYOiB0aGlzIHNlZW1zIGxpa2UgYSBidWcgaW4gdGhlIGFwaS5cbiAgICBpZiAocGFyc2VkQm9keSAmJiBwYXJzZWRCb2R5LmVycm9yKSB7XG4gICAgICByZXF1ZXN0U3VjY2Vzc2Z1bCA9IGZhbHNlO1xuICAgIH1cblxuICAgIGlmICghcmVxdWVzdFN1Y2Nlc3NmdWwpIHtcbiAgICAgIHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoXG4gICAgICAgICdIVFRQIHN0YXR1cyAnICsgcmVzcG9uc2Uuc3RhdHVzICsgJ1xcbicgK1xuICAgICAgICAvLyBub3RlIGludGVudGlvbmFsIHVzZSBvZiAhPSBpbnN0ZWFkIG9mICE9PVxuICAgICAgICAocGFyc2VkQm9keSAmJiBwYXJzZWRCb2R5Lm1lc3NhZ2UpID8gcGFyc2VkQm9keS5tZXNzYWdlIDogJydcbiAgICAgICkpO1xuICAgIH1cblxuICAgIGNhbGxiYWNrKG51bGwsIChmaWVsZCkgPyBwYXJzZWRCb2R5W2ZpZWxkXSA6IHBhcnNlZEJvZHkpO1xuICB9XG5cbiAgdXJsRW5jb2RlIChwYXJhbXMpIHtcbiAgICB2YXIgdXJsID0gW107XG4gICAgZm9yKHZhciBwYXJhbSBpbiBwYXJhbXMpIHtcbiAgICAgIHZhciB2YWx1ZXMgPSBwYXJhbXNbcGFyYW1dO1xuICAgICAgaWYoIXZhbHVlcy5mb3JFYWNoKVxuICAgICAgICB2YWx1ZXMgPSBbdmFsdWVzXTtcbiAgICAgIC8vIGV4cGFuZCBhbnkgYXJyYXlzXG4gICAgICB2YWx1ZXMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgdXJsLnB1c2goZW5jb2RlVVJJQ29tcG9uZW50KHBhcmFtKSArIFwiPVwiICtcbiAgICAgICAgICAgZW5jb2RlVVJJQ29tcG9uZW50KHZhbHVlKSk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIHVybC5qb2luKFwiJlwiKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlQ2xpZW50KG9wdGlvbnMpIHtcbiAgcmV0dXJuIG5ldyBCdWd6aWxsYUNsaWVudChvcHRpb25zKTtcbn1cbiIsImV4cG9ydCB2YXIgWE1MSHR0cFJlcXVlc3QgPSBudWxsO1xuXG5pZiAodHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgLy8gd2UncmUgbm90IGluIGEgYnJvd3Nlcj9cbiAgbGV0IF9sb2FkZXIgPSByZXF1aXJlO1xuICB0cnkge1xuICAgIFhNTEh0dHBSZXF1ZXN0ID0gX2xvYWRlcignc2RrL25ldC94aHInKS5YTUxIdHRwUmVxdWVzdDtcbiAgfSBjYXRjaChlKSB7XG4gICAgWE1MSHR0cFJlcXVlc3QgPSBfbG9hZGVyKFwieG1saHR0cHJlcXVlc3RcIikuWE1MSHR0cFJlcXVlc3Q7XG4gIH1cbn1cbmVsc2UgaWYodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIHdpbmRvdy5YTUxIdHRwUmVxdWVzdCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgWE1MSHR0cFJlcXVlc3QgPSB3aW5kb3cuWE1MSHR0cFJlcXVlc3Q7XG59XG5lbHNlIHtcbiAgdGhyb3cgXCJObyB3aW5kb3csIFdBVC5cIlxufVxuIl19
