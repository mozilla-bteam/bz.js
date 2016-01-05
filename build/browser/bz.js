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
  // we assume this is a valid bugilla instance.
  return function () {
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
    key: 'getProducts',
    value: function getProducts(product) {
      var _this = this;
      return new Promise(function (resolve, reject) {
        if (product === "selectable" || product === "enterable" || product === "accessible") {
          _this.APIRequest('/product?type=' + product, 'GET', function (err, products) {
            if (err) {
              return reject(err);
            } else {
              return resolve(products);
            }
          });
        } else {
          _this.APIRequest('/product/' + product, 'GET', function (err, products) {
            if (err) {
              return reject(err);
            } else {
              return resolve(products);
            }
          });
        }
      });
    }
  }, {
    key: 'getProduct',
    value: function getProduct(product) {
      var _this = this;
      return new Promise(function (resolve, reject) {
        _this.APIRequest('/product/' + product, 'GET', function (err, product) {
          if (err) {
            return reject(err);
          } else {
            return resolve(product);
          }
        });
      });
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
        params.login = this.username;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvYXVta2FyYS93b3Jrc3BhY2UvYnouanMvc3JjL2J6LmpzIiwiL1VzZXJzL2F1bWthcmEvd29ya3NwYWNlL2J6LmpzL3NyYy9pbmRleC5qcyIsIi9Vc2Vycy9hdW1rYXJhL3dvcmtzcGFjZS9iei5qcy9zcmMveGhyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7OztBQ0VBLElBQUksRUFBRSxHQUFHLE1BQU0sQ0FBQyxFQUFFLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDOzs7Ozs7Ozs7Ozs7Ozs7QUNGeEMsSUFBTSxjQUFjLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLGNBQWMsQ0FBQzs7Ozs7QUFLdkQsSUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDOzs7OztBQUt2QixJQUFNLGNBQWMsR0FBRyxDQUFDLFdBQVcsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDOztBQUV4RCxTQUFTLFlBQVksQ0FBQyxFQUFFLEVBQUUsUUFBUSxFQUFFO0FBQ2xDLE1BQUksT0FBTyxFQUFFLEtBQUssVUFBVSxFQUFFO0FBQzVCLFlBQVEsR0FBRyxFQUFFLENBQUM7QUFDZCxNQUFFLEdBQUcsU0FBUyxDQUFDO0dBQ2hCOztBQUVELFNBQU8sVUFBUyxHQUFHLEVBQUUsUUFBUSxFQUFFO0FBQzdCLFFBQUksR0FBRyxFQUFFLE9BQU8sUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDOztBQUU5QixRQUFJLFFBQVEsRUFBRTs7QUFFWixVQUFJLEVBQUUsS0FBSyxTQUFTLEVBQUU7QUFDcEIsVUFBRSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7T0FDL0I7QUFDRCxjQUFRLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0tBQzlCLE1BQ0k7QUFDSCxZ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QUFpQixDQUFBO0NBQ3hCIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8vIHRoaXMgZmlsZSBpcyB0aGUgZW50cnlwb2ludCBmb3IgYnVpbGRpbmcgYSBicm93c2VyIGZpbGUgd2l0aCBicm93c2VyaWZ5XG5cbnZhciBieiA9IHdpbmRvdy5ieiA9IHJlcXVpcmUoXCIuL2luZGV4XCIpOyIsImNvbnN0IFhNTEh0dHBSZXF1ZXN0ID0gcmVxdWlyZSgnLi94aHInKS5YTUxIdHRwUmVxdWVzdDtcblxuLyoqXG5Db25zdGFudCBmb3IgdGhlIGxvZ2luIGVudHJ5cG9pbnQuXG4qL1xuY29uc3QgTE9HSU4gPSAnL2xvZ2luJztcblxuLyoqXG5FcnJvcnMgcmVsYXRlZCB0byB0aGUgc29ja2V0IHRpbWVvdXQuXG4qL1xuY29uc3QgVElNRU9VVF9FUlJPUlMgPSBbJ0VUSU1FRE9VVCcsICdFU09DS0VUVElNRURPVVQnXTtcblxuZnVuY3Rpb24gZXh0cmFjdEZpZWxkKGlkLCBjYWxsYmFjaykge1xuICBpZiAodHlwZW9mIGlkID09PSAnZnVuY3Rpb24nKSB7XG4gICAgY2FsbGJhY2sgPSBpZDtcbiAgICBpZCA9IHVuZGVmaW5lZDtcbiAgfVxuXG4gIHJldHVybiBmdW5jdGlvbihlcnIsIHJlc3BvbnNlKSB7XG4gICAgaWYgKGVycikgcmV0dXJuIGNhbGxiYWNrKGVycik7XG5cbiAgICBpZiAocmVzcG9uc2UpIHtcbiAgICAgIC8vIGRlZmF1bHQgYmVoYXZpb3IgaXMgdG8gdXNlIHRoZSBmaXJzdCBpZCB3aGVuIHRoZSBjYWxsZXIgZG9lcyBub3QgcHJvdmlkZSBvbmUuXG4gICAgICBpZiAoaWQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZCA9IE9iamVjdC5rZXlzKHJlc3BvbnNlKVswXTtcbiAgICAgIH1cbiAgICAgIGNhbGxiYWNrKG51bGwsIHJlc3BvbnNlW2lkXSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdGhyb3cgXCJFcnJvcjosIG5vIHJlc3BvbnNlIGluIGV4dHJhY3RGaWVsZFwiO1xuICAgIH1cbiAgfTtcbn1cblxuLyoqXG5GdW5jdGlvbiBkZWNvcmF0b3Igd2hpY2ggd2lsbCBhdHRlbXB0IHRvIGxvZ2luIHRvIGJ1Z3ppbGxhXG53aXRoIHRoZSBjdXJyZW50IGNyZWRlbnRpYWxzIHByaW9yIHRvIG1ha2luZyB0aGUgYWN0dWFsIGFwaSBjYWxsLlxuXG4gICAgQnVnemlsbGEucHJvdG90eXBlLm1ldGhvZCA9IGxvZ2luKGZ1bmN0aW9uKHBhcmFtLCBwYXJhbSkge1xuICAgIH0pO1xuXG5AcGFyYW0ge0Z1bmN0aW9ufSBtZXRob2QgdG8gZGVjb3JhdGUuXG5AcmV0dXJuIHtGdW5jdGlvbn0gZGVjb3JhdGVkIG1ldGhvZC5cbiovXG5mdW5jdGlvbiBsb2dpblJlcXVpcmVkKG1ldGhvZCkge1xuICAvLyB3ZSBhc3N1bWUgdGhpcyBpcyBhIHZhbGlkIGJ1Z2lsbGEgaW5zdGFuY2UuXG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAvLyByZW1lbWJlciB8dGhpc3wgaXMgYSBidWd6aWxsYSBpbnN0YW5jZVxuXG4gICAgLy8gYXJncyBmb3IgdGhlIGRlY29yYXRlZCBtZXRob2RcbiAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyksXG4gICAgICAgIC8vIHdlIG5lZWQgdGhlIGNhbGxiYWNrIHNvIHdlIGNhbiBwYXNzIGxvZ2luIHJlbGF0ZWQgZXJyb3JzLlxuICAgICAgICBjYWxsYmFjayA9IGFyZ3NbYXJncy5sZW5ndGggLSAxXTtcblxuICAgIHRoaXMubG9naW4oZnVuY3Rpb24oZXJyKSB7XG4gICAgICBpZiAoZXJyKSByZXR1cm4gY2FsbGJhY2soZXJyKTtcblxuICAgICAgLy8gd2UgYXJlIG5vdyBsb2dnZWQgaW4gc28gdGhlIG1ldGhvZCBjYW4gcnVuIVxuICAgICAgbWV0aG9kLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH0uYmluZCh0aGlzKSk7XG4gIH07XG59XG5cbmV4cG9ydCB2YXIgQnVnemlsbGFDbGllbnQgPSBjbGFzcyB7XG5cbiAgY29uc3RydWN0b3Iob3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgdGhpcy51c2VybmFtZSA9IG9wdGlvbnMudXNlcm5hbWU7XG4gICAgdGhpcy5wYXNzd29yZCA9IG9wdGlvbnMucGFzc3dvcmQ7XG4gICAgdGhpcy50aW1lb3V0ID0gb3B0aW9ucy50aW1lb3V0IHx8IDA7XG4gICAgdGhpcy5hcGlfa2V5ID0gb3B0aW9ucy5hcGlfa2V5IHx8IG51bGw7XG5cbiAgICBpZiAob3B0aW9ucy50ZXN0KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ29wdGlvbnMudGVzdCBpcyBkZXByZWNhdGVkIHBsZWFzZSBzcGVjaWZ5IHRoZSB1cmwgZGlyZWN0bHknKTtcbiAgICB9XG5cbiAgICB0aGlzLmFwaVVybCA9IG9wdGlvbnMudXJsIHx8ICdodHRwczovL2J1Z3ppbGxhLm1vemlsbGEub3JnL3Jlc3QvJztcbiAgICB0aGlzLmFwaVVybCA9IHRoaXMuYXBpVXJsLnJlcGxhY2UoL1xcLyQvLCBcIlwiKTtcblxuICAgIHRoaXMuX2F1dGggPSBudWxsO1xuICB9XG4gIC8qKlxuICBBdXRoZW50aWNhdGlvbiBkZXRhaWxzIGZvciBnaXZlbiB1c2VyLlxuXG4gIEV4YW1wbGU6XG5cbiAgICAgIHsgaWQ6IDEyMjIsIHRva2VuOiAneHh4eCcgfVxuXG4gIEB0eXBlIHtPYmplY3R9XG4gICovXG5cblxuICAvKipcbiAgSW4gdGhlIFJFU1QgQVBJIHdlIGZpcnN0IGxvZ2luIHRvIGFjcXVpcmUgYSB0b2tlbiB3aGljaCBpcyB0aGVuIHVzZWQgdG8gbWFrZVxuICByZXF1ZXN0cy4gU2VlOiBodHRwOi8vYnpyLm1vemlsbGEub3JnL2Jtby80LjIvdmlldy9oZWFkOi9CdWd6aWxsYS9XZWJTZXJ2aWNlL1NlcnZlci9SRVNULnBtI0w1NTZcblxuICBUaGlzIG1ldGhvZCBjYW4gYmUgdXNlZCBwdWJsaWNseSBidXQgaXMgZGVzaWduZWQgZm9yIGludGVybmFsIGNvbnN1bXB0aW9uIGZvclxuICBlYXNlIG9mIHVzZS5cblxuICBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBbRXJyb3IgZXJyLCBTdHJpbmcgdG9rZW5dLlxuICAqL1xuICBsb2dpbiAoY2FsbGJhY2spIHtcblxuICAgIGlmICh0aGlzLl9hdXRoKSB7XG4gICAgICBjYWxsYmFjayhudWxsLCB0aGlzLl9hdXRoKTtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMudXNlcm5hbWUgfHwgIXRoaXMucGFzc3dvcmQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignbWlzc2luZyBvciBpbnZhbGlkIC51c2VybmFtZSBvciAucGFzc3dvcmQnKTtcbiAgICB9XG5cbiAgICB2YXIgcGFyYW1zID0ge1xuICAgICAgbG9naW46IHRoaXMudXNlcm5hbWUsXG4gICAgICBwYXNzd29yZDogdGhpcy5wYXNzd29yZFxuICAgIH07XG5cbiAgICB2YXIgaGFuZGxlTG9naW4gPSBmdW5jdGlvbiBoYW5kbGVMb2dpbihlcnIsIHJlc3BvbnNlKSB7XG4gICAgICBpZiAoZXJyKSByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgdGhpcy5fYXV0aCA9IHJlc3BvbnNlLnJlc3VsdFxuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHRoaXMuX2F1dGggPSByZXNwb25zZTtcbiAgICAgIH1cbiAgICAgIGNhbGxiYWNrKG51bGwsIHJlc3BvbnNlKTtcbiAgICB9LmJpbmQodGhpcyk7XG5cbiAgICB0aGlzLkFQSVJlcXVlc3QoJy9sb2dpbicsICdHRVQnLCBoYW5kbGVMb2dpbiwgbnVsbCwgbnVsbCwgcGFyYW1zKTtcbiAgfVxuXG4gIGdldEJ1ZyAoaWQsIHBhcmFtcywgY2FsbGJhY2spIHtcbiAgICBpZiAoIWNhbGxiYWNrKSB7XG4gICAgICAgY2FsbGJhY2sgPSBwYXJhbXM7XG4gICAgICAgcGFyYW1zID0ge307XG4gICAgfVxuXG4gICAgdGhpcy5BUElSZXF1ZXN0KFxuICAgICAgJy9idWcvJyArIGlkLFxuICAgICAgJ0dFVCcsXG4gICAgICBleHRyYWN0RmllbGQoY2FsbGJhY2spLFxuICAgICAgJ2J1Z3MnLFxuICAgICAgbnVsbCxcbiAgICAgIHBhcmFtc1xuICAgICk7XG4gIH1cblxuICBzZWFyY2hCdWdzIChwYXJhbXMsIGNhbGxiYWNrKSB7XG4gICAgdGhpcy5BUElSZXF1ZXN0KCcvYnVnJywgJ0dFVCcsIGNhbGxiYWNrLCAnYnVncycsIG51bGwsIHBhcmFtcyk7XG4gIH1cblxuICB1cGRhdGVCdWcgKGlkLCBidWcsIGNhbGxiYWNrKSB7XG4gICAgdGhpcy5BUElSZXF1ZXN0KCcvYnVnLycgKyBpZCwgJ1BVVCcsIGNhbGxiYWNrLCAnYnVncycsIGJ1Zyk7XG4gIH1cblxuICBjcmVhdGVCdWcgKGJ1ZywgY2FsbGJhY2spIHtcbiAgICB0aGlzLkFQSVJlcXVlc3QoJy9idWcnLCAnUE9TVCcsIGNhbGxiYWNrLCAnaWQnLCBidWcpO1xuICB9XG5cbiAgYnVnQ29tbWVudHMgKGlkLCBjYWxsYmFjaykge1xuICAgIHZhciBfY2FsbGJhY2sgPSBmdW5jdGlvbihlLCByKSB7XG4gICAgICBpZiAoZSkgdGhyb3cgZTtcbiAgICAgIHZhciBfYnVnX2NvbW1lbnRzID0gcltpZF07XG4gICAgICBpZiAodHlwZW9mIF9idWdfY29tbWVudHNbJ2NvbW1lbnRzJ10gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIC8vIGJ1Z3ppbGxhIDUgOihcbiAgICAgICAgX2J1Z19jb21tZW50cyA9IF9idWdfY29tbWVudHMuY29tbWVudHM7XG4gICAgICB9XG4gICAgICBjYWxsYmFjayhudWxsLCBfYnVnX2NvbW1lbnRzKTtcbiAgICB9XG5cbiAgICB0aGlzLkFQSVJlcXVlc3QoXG4gICAgICAnL2J1Zy8nICsgaWQgKyAnL2NvbW1lbnQnLFxuICAgICAgJ0dFVCcsXG4gICAgICBfY2FsbGJhY2ssXG4gICAgICAnYnVncydcbiAgICApO1xuICB9XG5cbiAgYWRkQ29tbWVudCAoaWQsIGNvbW1lbnQsIGNhbGxiYWNrKSB7XG4gICAgdGhpcy5BUElSZXF1ZXN0KFxuICAgICAgJy9idWcvJyArIGlkICsgJy9jb21tZW50JyxcbiAgICAgICdQT1NUJyxcbiAgICAgIGNhbGxiYWNrLFxuICAgICAgbnVsbCxcbiAgICAgIGNvbW1lbnRcbiAgICApO1xuICB9XG5cbiAgYnVnSGlzdG9yeSAoaWQsIGNhbGxiYWNrKSB7XG4gICAgdGhpcy5BUElSZXF1ZXN0KFxuICAgICAgJy9idWcvJyArIGlkICsgJy9oaXN0b3J5JyxcbiAgICAgICdHRVQnLFxuICAgICAgY2FsbGJhY2ssXG4gICAgICAnYnVncydcbiAgICApO1xuICB9XG5cbiAgLyoqXG4gICAqIEZpbmRzIGFsbCBhdHRhY2htZW50cyBmb3IgYSBnaXZlbiBidWcgI1xuICAgKiBodHRwOi8vd3d3LmJ1Z3ppbGxhLm9yZy9kb2NzL3RpcC9lbi9odG1sL2FwaS9CdWd6aWxsYS9XZWJTZXJ2aWNlL0J1Zy5odG1sI2F0dGFjaG1lbnRzXG4gICAqXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBpZCBvZiBidWcuXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IFtFcnJvciwgQXJyYXk8QXR0YWNobWVudD5dLlxuICAgKi9cbiAgYnVnQXR0YWNobWVudHMgKGlkLCBjYWxsYmFjaykge1xuICAgIHRoaXMuQVBJUmVxdWVzdChcbiAgICAgICcvYnVnLycgKyBpZCArICcvYXR0YWNobWVudCcsXG4gICAgICAnR0VUJyxcbiAgICAgIGV4dHJhY3RGaWVsZChpZCwgY2FsbGJhY2spLFxuICAgICAgJ2J1Z3MnXG4gICAgKTtcbiAgfVxuXG4gIGNyZWF0ZUF0dGFjaG1lbnQgKGlkLCBhdHRhY2htZW50LCBjYWxsYmFjaykge1xuICAgIHRoaXMuQVBJUmVxdWVzdChcbiAgICAgICcvYnVnLycgKyBpZCArICcvYXR0YWNobWVudCcsXG4gICAgICAnUE9TVCcsXG4gICAgICBleHRyYWN0RmllbGQoY2FsbGJhY2spLFxuICAgICAgJ2lkcycsXG4gICAgICBhdHRhY2htZW50XG4gICAgKTtcbiAgfVxuXG4gIGdldEF0dGFjaG1lbnQgKGlkLCBjYWxsYmFjaykge1xuICAgIHRoaXMuQVBJUmVxdWVzdChcbiAgICAgICcvYnVnL2F0dGFjaG1lbnQvJyArIGlkLFxuICAgICAgJ0dFVCcsXG4gICAgICBleHRyYWN0RmllbGQoY2FsbGJhY2spLFxuICAgICAgJ2F0dGFjaG1lbnRzJ1xuICAgICk7XG4gIH1cblxuICB1cGRhdGVBdHRhY2htZW50IChpZCwgYXR0YWNobWVudCwgY2FsbGJhY2spIHtcbiAgICB0aGlzLkFQSVJlcXVlc3QoJy9idWcvYXR0YWNobWVudC8nICsgaWQsICdQVVQnLCBjYWxsYmFjaywgJ29rJywgYXR0YWNobWVudCk7XG4gIH1cblxuICBzZWFyY2hVc2VycyAobWF0Y2gsIGNhbGxiYWNrKSB7XG4gICAgdGhpcy5BUElSZXF1ZXN0KCcvdXNlcicsICdHRVQnLCBjYWxsYmFjaywgJ3VzZXJzJywgbnVsbCwge21hdGNoOiBtYXRjaH0pO1xuICB9XG5cbiAgZ2V0VXNlciAoaWQsIGNhbGxiYWNrKSB7XG4gICAgdGhpcy5BUElSZXF1ZXN0KFxuICAgICAgJy91c2VyLycgKyBpZCxcbiAgICAgICdHRVQnLFxuICAgICAgZXh0cmFjdEZpZWxkKGNhbGxiYWNrKSxcbiAgICAgICd1c2VycydcbiAgICApO1xuICB9XG5cbiAgZ2V0U3VnZ2VzdGVkUmV2aWV3ZXJzIChpZCwgY2FsbGJhY2spIHtcbiAgICAvLyBCTU8tIHNwZWNpZmljIGV4dGVuc2lvbiB0byBnZXQgc3VnZ2VzdGVkIHJldmlld2VycyBmb3IgYSBnaXZlbiBidWdcbiAgICAvLyBodHRwOi8vYnpyLm1vemlsbGEub3JnL2Jtby80LjIvdmlldy9oZWFkOi9leHRlbnNpb25zL1Jldmlldy9saWIvV2ViU2VydmljZS5wbSNMMTAyXG4gICAgdGhpcy5BUElSZXF1ZXN0KCcvcmV2aWV3L3N1Z2dlc3Rpb25zLycgKyBpZCwgJ0dFVCcsIGNhbGxiYWNrKTtcbiAgfVxuXG4gIC8qXG4gICAgWFhYIHRoaXMgY2FsbCBpcyBwcm92aWRlZCBmb3IgY29udmVuaWVuY2UgdG8gcGVvcGxlIHNjcmlwdGluZyBhZ2FpbnN0IHByb2QgYnVnemlsbHFcbiAgICBUSEVSRSBJUyBOTyBFUVVJVkFMRU5UIFJFU1QgQ0FMTCBJTiBUSVAsIHNvIHRoaXMgc2hvdWxkIG5vdCBiZSB0ZXN0ZWQgYWdhaW5zdCB0aXAsIGhlbmNlXG4gICAgdGhlIGhhcmQtY29kZWQgdXJsLlxuICAqL1xuICBnZXRDb25maWd1cmF0aW9uIChwYXJhbXMsIGNhbGxiYWNrKSB7XG4gICAgaWYgKCFjYWxsYmFjaykge1xuICAgICAgIGNhbGxiYWNrID0gcGFyYW1zO1xuICAgICAgIHBhcmFtcyA9IHt9O1xuICAgIH1cblxuICAgIC8vIHRoaXMuQVBJUmVxdWVzdCgnL2NvbmZpZ3VyYXRpb24nLCAnR0VUJywgY2FsbGJhY2ssIG51bGwsIG51bGwsIHBhcmFtcyk7XG4gICAgLy8gVUdMQVkgdGVtcCBmaXggdW50aWwgL2NvbmZpZ3VyYXRpb24gaXMgaW1wbGVtZW50ZWQsXG4gICAgLy8gc2VlIGh0dHBzOi8vYnVnemlsbGEubW96aWxsYS5vcmcvc2hvd19idWcuY2dpP2lkPTkyNDQwNSNjMTE6XG4gICAgbGV0IHRoYXQgPSB0aGlzO1xuXG4gICAgdmFyIHJlcSA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgIHJlcS5vcGVuKCdHRVQnLCAnaHR0cHM6Ly9hcGktZGV2LmJ1Z3ppbGxhLm1vemlsbGEub3JnL2xhdGVzdC9jb25maWd1cmF0aW9uJywgdHJ1ZSk7XG4gICAgcmVxLnNldFJlcXVlc3RIZWFkZXIoXCJBY2NlcHRcIiwgXCJhcHBsaWNhdGlvbi9qc29uXCIpO1xuICAgIHJlcS5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgIGlmIChyZXEucmVhZHlTdGF0ZSA9PSA0ICYmIHJlcS5zdGF0dXMgIT0gMCkge1xuICAgICAgICB0aGF0LmhhbmRsZVJlc3BvbnNlKG51bGwsIHJlcSwgY2FsbGJhY2spO1xuICAgICAgfVxuICAgIH07XG4gICAgcmVxLnRpbWVvdXQgPSB0aGlzLnRpbWVvdXQ7XG4gICAgcmVxLm9udGltZW91dCA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgdGhhdC5oYW5kbGVSZXNwb25zZSgndGltZW91dCcsIHJlcSwgY2FsbGJhY2spO1xuICAgIH07XG4gICAgcmVxLm9uZXJyb3IgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgIHRoYXQuaGFuZGxlUmVzcG9uc2UoJ2Vycm9yJywgcmVxLCBjYWxsYmFjayk7XG4gICAgfTtcbiAgICByZXEuc2VuZCgpO1xuICB9XG5cbiAgZ2V0UHJvZHVjdHMgKHByb2R1Y3QpIHtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIGlmKCBwcm9kdWN0ID09PSBcInNlbGVjdGFibGVcIiB8fCBwcm9kdWN0ID09PSBcImVudGVyYWJsZVwiIHx8IHByb2R1Y3QgPT09IFwiYWNjZXNzaWJsZVwiICkge1xuICAgICAgICBfdGhpcy5BUElSZXF1ZXN0KFxuICAgICAgICAgICcvcHJvZHVjdD90eXBlPScgKyBwcm9kdWN0LFxuICAgICAgICAgICdHRVQnLFxuICAgICAgICAgIGZ1bmN0aW9uKGVyciwgcHJvZHVjdHMpIHtcbiAgICAgICAgICAgIGlmKGVycikge1xuICAgICAgICAgICAgICByZXR1cm4gcmVqZWN0KGVycik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXR1cm4gcmVzb2x2ZShwcm9kdWN0cyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgX3RoaXMuQVBJUmVxdWVzdChcbiAgICAgICAgICAnL3Byb2R1Y3QvJyArIHByb2R1Y3QsXG4gICAgICAgICAgJ0dFVCcsXG4gICAgICAgICAgZnVuY3Rpb24oZXJyLCBwcm9kdWN0cykge1xuICAgICAgICAgICAgaWYoZXJyKSB7XG4gICAgICAgICAgICAgIHJldHVybiByZWplY3QoZXJyKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJldHVybiByZXNvbHZlKHByb2R1Y3RzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBnZXRQcm9kdWN0IChwcm9kdWN0KSB7XG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICBfdGhpcy5BUElSZXF1ZXN0KFxuICAgICAgICAnL3Byb2R1Y3QvJyArIHByb2R1Y3QsXG4gICAgICAgICdHRVQnLFxuICAgICAgICBmdW5jdGlvbihlcnIsIHByb2R1Y3QpIHtcbiAgICAgICAgICAgIGlmKGVycikge1xuICAgICAgICAgICAgICByZXR1cm4gcmVqZWN0KGVycik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXR1cm4gcmVzb2x2ZShwcm9kdWN0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICApO1xuICAgIH0pO1xuICB9XG5cbiAgQVBJUmVxdWVzdCAocGF0aCwgbWV0aG9kLCBjYWxsYmFjaywgZmllbGQsIGJvZHksIHBhcmFtcykge1xuICAgIGlmIChcbiAgICAgIC8vIGlmIHdlIGFyZSBkb2luZyB0aGUgbG9naW5cbiAgICAgIHBhdGggPT09IExPR0lOIHx8XG4gICAgICAvLyBpZiB3ZSBhcmUgYWxyZWFkeSBhdXRoZWRcbiAgICAgIHRoaXMuX2F1dGggfHxcbiAgICAgIC8vIG9yIHdlIGFyZSBtaXNzaW5nIGF1dGggZGF0YVxuICAgICAgIXRoaXMucGFzc3dvcmQgfHwgIXRoaXMudXNlcm5hbWVcbiAgICApIHtcbiAgICAgIC8vIHNraXAgYXV0b21hdGljIGF1dGhlbnRpY2F0aW9uXG4gICAgICByZXR1cm4gdGhpcy5fQVBJUmVxdWVzdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cblxuICAgIGxldCBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuXG4gICAgdGhpcy5sb2dpbihmdW5jdGlvbihlcnIpIHtcbiAgICAgIGlmIChlcnIpIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgdGhpcy5fQVBJUmVxdWVzdC5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9LmJpbmQodGhpcykpO1xuICB9XG5cbiAgX0FQSVJlcXVlc3QgKHBhdGgsIG1ldGhvZCwgY2FsbGJhY2ssIGZpZWxkLCBib2R5LCBwYXJhbXMpIHtcbiAgICBsZXQgdXJsID0gdGhpcy5hcGlVcmwgKyBwYXRoO1xuXG4gICAgcGFyYW1zID0gcGFyYW1zIHx8IHt9O1xuXG4gICAgaWYodGhpcy5hcGlfa2V5KSB7IHBhcmFtcy5hcGlfa2V5ID0gdGhpcy5hcGlfa2V5OyB9XG5cbiAgICBpZiAodGhpcy5fYXV0aCkge1xuICAgICAgcGFyYW1zLnRva2VuID0gdGhpcy5fYXV0aC50b2tlbjtcbiAgICB9XG4gICAgZWxzZSBpZiAodGhpcy51c2VybmFtZSAmJiB0aGlzLnBhc3N3b3JkKSB7XG4gICAgICBwYXJhbXMubG9naW4gPSB0aGlzLnVzZXJuYW1lO1xuICAgICAgcGFyYW1zLnBhc3N3b3JkID0gdGhpcy5wYXNzd29yZDtcbiAgICB9XG5cbiAgICBpZiAocGFyYW1zICYmIE9iamVjdC5rZXlzKHBhcmFtcykubGVuZ3RoID4gMCkge1xuICAgICAgdXJsICs9IFwiP1wiICsgdGhpcy51cmxFbmNvZGUocGFyYW1zKTtcbiAgICB9XG5cbiAgICBib2R5ID0gSlNPTi5zdHJpbmdpZnkoYm9keSk7XG5cbiAgICBsZXQgdGhhdCA9IHRoaXM7XG5cbiAgICB2YXIgcmVxID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgcmVxLm9wZW4obWV0aG9kLCB1cmwsIHRydWUpO1xuICAgIHJlcS5zZXRSZXF1ZXN0SGVhZGVyKFwiQWNjZXB0XCIsIFwiYXBwbGljYXRpb24vanNvblwiKTtcbiAgICBpZiAobWV0aG9kLnRvVXBwZXJDYXNlKCkgIT09IFwiR0VUXCIpIHtcbiAgICAgIHJlcS5zZXRSZXF1ZXN0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwiYXBwbGljYXRpb24vanNvblwiKTtcbiAgICB9XG4gICAgcmVxLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgaWYgKHJlcS5yZWFkeVN0YXRlID09IDQgJiYgcmVxLnN0YXR1cyAhPSAwKSB7XG4gICAgICAgIHRoYXQuaGFuZGxlUmVzcG9uc2UobnVsbCwgcmVxLCBjYWxsYmFjaywgZmllbGQpO1xuICAgICAgfVxuICAgIH07XG4gICAgcmVxLnRpbWVvdXQgPSB0aGlzLnRpbWVvdXQ7XG4gICAgcmVxLm9udGltZW91dCA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgdGhhdC5oYW5kbGVSZXNwb25zZSgndGltZW91dCcsIHJlcSwgY2FsbGJhY2spO1xuICAgIH07XG4gICAgcmVxLm9uZXJyb3IgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgIHRoYXQuaGFuZGxlUmVzcG9uc2UoZXZlbnQsIHJlcSwgY2FsbGJhY2spO1xuICAgIH07XG4gICAgcmVxLnNlbmQoYm9keSk7XG4gIH1cblxuICBoYW5kbGVSZXNwb25zZSAoZXJyLCByZXNwb25zZSwgY2FsbGJhY2ssIGZpZWxkKSB7XG4gICAgLy8gZGV0ZWN0IHRpbWVvdXQgZXJyb3JzXG4gICAgaWYgKGVyciAmJiBlcnIuY29kZSAmJiBUSU1FT1VUX0VSUk9SUy5pbmRleE9mKGVyci5jb2RlKSAhPT0gLTEpIHtcbiAgICAgIHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoJ3RpbWVvdXQnKSk7XG4gICAgfVxuXG4gICAgLy8gaGFuZGxlIGdlbmVyaWMgZXJyb3JzXG4gICAgaWYgKGVycikgcmV0dXJuIGNhbGxiYWNrKGVycik7XG5cbiAgICAvLyBhbnl0aGluZyBpbiAyMDAgc3RhdHVzIHJhbmdlIGlzIGEgc3VjY2Vzc1xuICAgIHZhciByZXF1ZXN0U3VjY2Vzc2Z1bCA9IHJlc3BvbnNlLnN0YXR1cyA+IDE5OSAmJiByZXNwb25zZS5zdGF0dXMgPCAzMDA7XG5cbiAgICAvLyBldmVuIGluIHRoZSBjYXNlIG9mIGFuIHVuc3VjY2Vzc2Z1bCByZXF1ZXN0IHdlIG1heSBoYXZlIGpzb24gZGF0YS5cbiAgICB2YXIgcGFyc2VkQm9keTtcblxuICAgIHRyeSB7XG4gICAgICBwYXJzZWRCb2R5ID0gSlNPTi5wYXJzZShyZXNwb25zZS5yZXNwb25zZVRleHQpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIC8vIFhYWDogbWlnaHQgd2FudCB0byBoYW5kbGUgdGhpcyBiZXR0ZXIgaW4gdGhlIHJlcXVlc3Qgc3VjY2VzcyBjYXNlP1xuICAgICAgaWYgKHJlcXVlc3RTdWNjZXNzZnVsKSB7XG4gICAgICAgIHJldHVybiBjYWxsYmFjayhcbiAgICAgICAgICBuZXcgRXJyb3IoJ3Jlc3BvbnNlIHdhcyBub3QgdmFsaWQganNvbjogJyArIHJlc3BvbnNlLnJlc3BvbnNlVGV4dClcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBkZXRlY3QgaWYgd2UncmUgcnVubmluZyBCdWd6aWxsYSA1LjBcbiAgICBpZiAodHlwZW9mIHBhcnNlZEJvZHlbJ3Jlc3VsdCddICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgcGFyc2VkQm9keSA9IHBhcnNlZEJvZHlbJ3Jlc3VsdCddO1xuICAgIH1cblxuICAgIC8vIHN1Y2Nlc3NmdWwgaHR0cCByZXNwbnNlIGJ1dCBhbiBlcnJvclxuICAgIC8vIFhYWDogdGhpcyBzZWVtcyBsaWtlIGEgYnVnIGluIHRoZSBhcGkuXG4gICAgaWYgKHBhcnNlZEJvZHkgJiYgcGFyc2VkQm9keS5lcnJvcikge1xuICAgICAgcmVxdWVzdFN1Y2Nlc3NmdWwgPSBmYWxzZTtcbiAgICB9XG5cbiAgICBpZiAoIXJlcXVlc3RTdWNjZXNzZnVsKSB7XG4gICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKFxuICAgICAgICAnSFRUUCBzdGF0dXMgJyArIHJlc3BvbnNlLnN0YXR1cyArICdcXG4nICtcbiAgICAgICAgLy8gbm90ZSBpbnRlbnRpb25hbCB1c2Ugb2YgIT0gaW5zdGVhZCBvZiAhPT1cbiAgICAgICAgKHBhcnNlZEJvZHkgJiYgcGFyc2VkQm9keS5tZXNzYWdlKSA/IHBhcnNlZEJvZHkubWVzc2FnZSA6ICcnXG4gICAgICApKTtcbiAgICB9XG5cbiAgICBjYWxsYmFjayhudWxsLCAoZmllbGQpID8gcGFyc2VkQm9keVtmaWVsZF0gOiBwYXJzZWRCb2R5KTtcbiAgfVxuXG4gIHVybEVuY29kZSAocGFyYW1zKSB7XG4gICAgdmFyIHVybCA9IFtdO1xuICAgIGZvcih2YXIgcGFyYW0gaW4gcGFyYW1zKSB7XG4gICAgICB2YXIgdmFsdWVzID0gcGFyYW1zW3BhcmFtXTtcbiAgICAgIGlmKCF2YWx1ZXMuZm9yRWFjaClcbiAgICAgICAgdmFsdWVzID0gW3ZhbHVlc107XG4gICAgICAvLyBleHBhbmQgYW55IGFycmF5c1xuICAgICAgdmFsdWVzLmZvckVhY2goZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgIHVybC5wdXNoKGVuY29kZVVSSUNvbXBvbmVudChwYXJhbSkgKyBcIj1cIiArXG4gICAgICAgICAgIGVuY29kZVVSSUNvbXBvbmVudCh2YWx1ZSkpO1xuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiB1cmwuam9pbihcIiZcIik7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUNsaWVudChvcHRpb25zKSB7XG4gIHJldHVybiBuZXcgQnVnemlsbGFDbGllbnQob3B0aW9ucyk7XG59XG4iLCJleHBvcnQgdmFyIFhNTEh0dHBSZXF1ZXN0ID0gbnVsbDtcblxuaWYgKHR5cGVvZiB3aW5kb3cgPT09ICd1bmRlZmluZWQnKSB7XG4gIC8vIHdlJ3JlIG5vdCBpbiBhIGJyb3dzZXI/XG4gIGxldCBfbG9hZGVyID0gcmVxdWlyZTtcbiAgdHJ5IHtcbiAgICBYTUxIdHRwUmVxdWVzdCA9IF9sb2FkZXIoJ3Nkay9uZXQveGhyJykuWE1MSHR0cFJlcXVlc3Q7XG4gIH0gY2F0Y2goZSkge1xuICAgIFhNTEh0dHBSZXF1ZXN0ID0gX2xvYWRlcihcInhtbGh0dHByZXF1ZXN0XCIpLlhNTEh0dHBSZXF1ZXN0O1xuICB9XG59XG5lbHNlIGlmKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiB3aW5kb3cuWE1MSHR0cFJlcXVlc3QgIT09ICd1bmRlZmluZWQnKSB7XG4gIFhNTEh0dHBSZXF1ZXN0ID0gd2luZG93LlhNTEh0dHBSZXF1ZXN0O1xufVxuZWxzZSB7XG4gIHRocm93IFwiTm8gd2luZG93LCBXQVQuXCJcbn1cbiJdfQ==
