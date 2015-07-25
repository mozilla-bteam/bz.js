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

      // so we can pass the arguments inside of another function
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvamVmZi9iei5qcy9zcmMvYnouanMiLCIvVXNlcnMvamVmZi9iei5qcy9zcmMvaW5kZXguanMiLCIvVXNlcnMvamVmZi9iei5qcy9zcmMveGhyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7OztBQ0VBLElBQUksRUFBRSxHQUFHLE1BQU0sQ0FBQyxFQUFFLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDOzs7Ozs7Ozs7OztRQzhaeEIsWUFBWSxHQUFaLFlBQVk7Ozs7QUFoYTVCLElBQU0sY0FBYyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxjQUFjLENBQUM7Ozs7O0FBS3ZELElBQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQzs7Ozs7QUFLdkIsSUFBTSxjQUFjLEdBQUcsQ0FBQyxXQUFXLEVBQUUsaUJBQWlCLENBQUMsQ0FBQzs7QUFFeEQsU0FBUyxZQUFZLENBQUMsRUFBRSxFQUFFLFFBQVEsRUFBRTtBQUNsQyxNQUFJLE9BQU8sRUFBRSxLQUFLLFVBQVUsRUFBRTtBQUM1QixZQUFRLEdBQUcsRUFBRSxDQUFDO0FBQ2QsTUFBRSxHQUFHLFNBQVMsQ0FBQztHQUNoQjs7QUFFRCxTQUFPLFVBQVMsR0FBRyxFQUFFLFFBQVEsRUFBRTtBQUM3QixRQUFJLEdBQUcsRUFBRSxPQUFPLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQzs7QUFFOUIsUUFBSSxRQUFRLEVBQUU7O0FBRVosVUFBSSxFQUFFLEtBQUssU0FBUyxFQUFFO0FBQ3BCLFVBQUUsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO09BQy9CO0FBQ0QsY0FBUSxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztLQUM5QixNQUNJO0FBQ0gsWUFBTSxxQ0FBcUMsQ0FBQztL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Q0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsR0FBRyxHQUFHLEdBQ3RDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7U0FDL0IsQ0FBQyxDQUFDO09BQ0o7QUFDRCxhQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7S0FDdEI7OztTQTlWUSxjQUFjO0lBK1Z4QixDQUFBOztRQS9WVSxjQUFjLEdBQWQsY0FBYzs7QUFpV2xCLFNBQVMsWUFBWSxDQUFDLE9BQU8sRUFBRTtBQUNwQyxTQUFPLElBQUksY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0NBQ3BDOzs7Ozs7OztBQ2xhTSxJQUFJLGNBQWMsR0FBRyxJQUFJLENBQUM7O1FBQXRCLGNBQWMsR0FBZCxjQUFjO0FBRXpCLElBQUksT0FBTyxNQUFNLEtBQUssV0FBVyxFQUFFOztBQUVqQyxNQUFJLE9BQU8sR0FBRyxPQUFPLENBQUM7QUFDdEIsTUFBSTtBQUNGLFlBTk8sY0FBYyxHQU1yQixjQUFjLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDLGNBQWMsQ0FBQztHQUN4RCxDQUFDLE9BQU0sQ0FBQyxFQUFFO0FBQ1QsWUFSTyxjQUFjLEdBUXJCLGNBQWMsR0FBRyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxjQUFjLENBQUM7R0FDM0Q7Q0FDRixNQUNJLElBQUcsT0FBTyxNQUFNLEtBQUssV0FBVyxJQUFJLE9BQU8sTUFBTSxDQUFDLGNBQWMsS0FBSyxXQUFXLEVBQUU7QUFDckYsVUFaUyxjQUFjLEdBWXZCLGNBQWMsR0FBRyxNQUFNLENBQUMsY0FBYyxDQUFDO0NBQ3hDLE1BQ0k7QUFDSCxRQUFNLGlCQUFpQixDQUFBO0NBQ3hCIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8vIHRoaXMgZmlsZSBpcyB0aGUgZW50cnlwb2ludCBmb3IgYnVpbGRpbmcgYSBicm93c2VyIGZpbGUgd2l0aCBicm93c2VyaWZ5XG5cbnZhciBieiA9IHdpbmRvdy5ieiA9IHJlcXVpcmUoXCIuL2luZGV4XCIpOyIsImNvbnN0IFhNTEh0dHBSZXF1ZXN0ID0gcmVxdWlyZSgnLi94aHInKS5YTUxIdHRwUmVxdWVzdDtcblxuLyoqXG5Db25zdGFudCBmb3IgdGhlIGxvZ2luIGVudHJ5cG9pbnQuXG4qL1xuY29uc3QgTE9HSU4gPSAnL2xvZ2luJztcblxuLyoqXG5FcnJvcnMgcmVsYXRlZCB0byB0aGUgc29ja2V0IHRpbWVvdXQuXG4qL1xuY29uc3QgVElNRU9VVF9FUlJPUlMgPSBbJ0VUSU1FRE9VVCcsICdFU09DS0VUVElNRURPVVQnXTtcblxuZnVuY3Rpb24gZXh0cmFjdEZpZWxkKGlkLCBjYWxsYmFjaykge1xuICBpZiAodHlwZW9mIGlkID09PSAnZnVuY3Rpb24nKSB7XG4gICAgY2FsbGJhY2sgPSBpZDtcbiAgICBpZCA9IHVuZGVmaW5lZDtcbiAgfVxuXG4gIHJldHVybiBmdW5jdGlvbihlcnIsIHJlc3BvbnNlKSB7XG4gICAgaWYgKGVycikgcmV0dXJuIGNhbGxiYWNrKGVycik7XG5cbiAgICBpZiAocmVzcG9uc2UpIHtcbiAgICAgIC8vIGRlZmF1bHQgYmVoYXZpb3IgaXMgdG8gdXNlIHRoZSBmaXJzdCBpZCB3aGVuIHRoZSBjYWxsZXIgZG9lcyBub3QgcHJvdmlkZSBvbmUuXG4gICAgICBpZiAoaWQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZCA9IE9iamVjdC5rZXlzKHJlc3BvbnNlKVswXTtcbiAgICAgIH1cbiAgICAgIGNhbGxiYWNrKG51bGwsIHJlc3BvbnNlW2lkXSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdGhyb3cgXCJFcnJvcjosIG5vIHJlc3BvbnNlIGluIGV4dHJhY3RGaWVsZFwiO1xuICAgIH1cbiAgfTtcbn1cblxuLyoqXG5GdW5jdGlvbiBkZWNvcmF0b3Igd2hpY2ggd2lsbCBhdHRlbXB0IHRvIGxvZ2luIHRvIGJ1Z3ppbGxhXG53aXRoIHRoZSBjdXJyZW50IGNyZWRlbnRpYWxzIHByaW9yIHRvIG1ha2luZyB0aGUgYWN0dWFsIGFwaSBjYWxsLlxuXG4gICAgQnVnemlsbGEucHJvdG90eXBlLm1ldGhvZCA9IGxvZ2luKGZ1bmN0aW9uKHBhcmFtLCBwYXJhbSkge1xuICAgIH0pO1xuXG5AcGFyYW0ge0Z1bmN0aW9ufSBtZXRob2QgdG8gZGVjb3JhdGUuXG5AcmV0dXJuIHtGdW5jdGlvbn0gZGVjb3JhdGVkIG1ldGhvZC5cbiovXG5mdW5jdGlvbiBsb2dpblJlcXVpcmVkKG1ldGhvZCkge1xuICAvLyB3ZSBhc3N1bWUgdGhpcyBpcyBhIHZhbGlkIGJ1Z2lsbGEgaW5zdGFuY2UuXG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAvLyByZW1lbWJlciB8dGhpc3wgaXMgYSBidWd6aWxsYSBpbnN0YW5jZVxuXG4gICAgLy8gYXJncyBmb3IgdGhlIGRlY29yYXRlZCBtZXRob2RcbiAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyksXG4gICAgICAgIC8vIHdlIG5lZWQgdGhlIGNhbGxiYWNrIHNvIHdlIGNhbiBwYXNzIGxvZ2luIHJlbGF0ZWQgZXJyb3JzLlxuICAgICAgICBjYWxsYmFjayA9IGFyZ3NbYXJncy5sZW5ndGggLSAxXTtcblxuICAgIHRoaXMubG9naW4oZnVuY3Rpb24oZXJyKSB7XG4gICAgICBpZiAoZXJyKSByZXR1cm4gY2FsbGJhY2soZXJyKTtcblxuICAgICAgLy8gd2UgYXJlIG5vdyBsb2dnZWQgaW4gc28gdGhlIG1ldGhvZCBjYW4gcnVuIVxuICAgICAgbWV0aG9kLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH0uYmluZCh0aGlzKSk7XG4gIH07XG59XG5cbmV4cG9ydCB2YXIgQnVnemlsbGFDbGllbnQgPSBjbGFzcyB7XG5cbiAgY29uc3RydWN0b3Iob3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgdGhpcy51c2VybmFtZSA9IG9wdGlvbnMudXNlcm5hbWU7XG4gICAgdGhpcy5wYXNzd29yZCA9IG9wdGlvbnMucGFzc3dvcmQ7XG4gICAgdGhpcy50aW1lb3V0ID0gb3B0aW9ucy50aW1lb3V0IHx8IDA7XG5cbiAgICBpZiAob3B0aW9ucy50ZXN0KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ29wdGlvbnMudGVzdCBpcyBkZXByZWNhdGVkIHBsZWFzZSBzcGVjaWZ5IHRoZSB1cmwgZGlyZWN0bHknKTtcbiAgICB9XG5cbiAgICB0aGlzLmFwaVVybCA9IG9wdGlvbnMudXJsIHx8ICdodHRwczovL2J1Z3ppbGxhLm1vemlsbGEub3JnL3Jlc3QvJztcbiAgICB0aGlzLmFwaVVybCA9IHRoaXMuYXBpVXJsLnJlcGxhY2UoL1xcLyQvLCBcIlwiKTtcblxuICAgIHRoaXMuX2F1dGggPSBudWxsO1xuICB9XG4gIC8qKlxuICBBdXRoZW50aWNhdGlvbiBkZXRhaWxzIGZvciBnaXZlbiB1c2VyLlxuXG4gIEV4YW1wbGU6XG5cbiAgICAgIHsgaWQ6IDEyMjIsIHRva2VuOiAneHh4eCcgfVxuXG4gIEB0eXBlIHtPYmplY3R9XG4gICovXG5cblxuICAvKipcbiAgSW4gdGhlIFJFU1QgQVBJIHdlIGZpcnN0IGxvZ2luIHRvIGFjcXVpcmUgYSB0b2tlbiB3aGljaCBpcyB0aGVuIHVzZWQgdG8gbWFrZVxuICByZXF1ZXN0cy4gU2VlOiBodHRwOi8vYnpyLm1vemlsbGEub3JnL2Jtby80LjIvdmlldy9oZWFkOi9CdWd6aWxsYS9XZWJTZXJ2aWNlL1NlcnZlci9SRVNULnBtI0w1NTZcblxuICBUaGlzIG1ldGhvZCBjYW4gYmUgdXNlZCBwdWJsaWNseSBidXQgaXMgZGVzaWduZWQgZm9yIGludGVybmFsIGNvbnN1bXB0aW9uIGZvclxuICBlYXNlIG9mIHVzZS5cblxuICBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBbRXJyb3IgZXJyLCBTdHJpbmcgdG9rZW5dLlxuICAqL1xuICBsb2dpbiAoY2FsbGJhY2spIHtcblxuICAgIGlmICh0aGlzLl9hdXRoKSB7XG4gICAgICBjYWxsYmFjayhudWxsLCB0aGlzLl9hdXRoKTtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMudXNlcm5hbWUgfHwgIXRoaXMucGFzc3dvcmQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignbWlzc2luZyBvciBpbnZhbGlkIC51c2VybmFtZSBvciAucGFzc3dvcmQnKTtcbiAgICB9XG5cbiAgICB2YXIgcGFyYW1zID0ge1xuICAgICAgbG9naW46IHRoaXMudXNlcm5hbWUsXG4gICAgICBwYXNzd29yZDogdGhpcy5wYXNzd29yZFxuICAgIH07XG5cbiAgICB2YXIgaGFuZGxlTG9naW4gPSBmdW5jdGlvbiBoYW5kbGVMb2dpbihlcnIsIHJlc3BvbnNlKSB7XG4gICAgICBpZiAoZXJyKSByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgdGhpcy5fYXV0aCA9IHJlc3BvbnNlLnJlc3VsdFxuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHRoaXMuX2F1dGggPSByZXNwb25zZTtcbiAgICAgIH1cbiAgICAgIGNhbGxiYWNrKG51bGwsIHJlc3BvbnNlKTtcbiAgICB9LmJpbmQodGhpcyk7XG5cbiAgICB0aGlzLkFQSVJlcXVlc3QoJy9sb2dpbicsICdHRVQnLCBoYW5kbGVMb2dpbiwgbnVsbCwgbnVsbCwgcGFyYW1zKTtcbiAgfVxuXG4gIGdldEJ1ZyAoaWQsIHBhcmFtcywgY2FsbGJhY2spIHtcbiAgICBpZiAoIWNhbGxiYWNrKSB7XG4gICAgICAgY2FsbGJhY2sgPSBwYXJhbXM7XG4gICAgICAgcGFyYW1zID0ge307XG4gICAgfVxuXG4gICAgdGhpcy5BUElSZXF1ZXN0KFxuICAgICAgJy9idWcvJyArIGlkLFxuICAgICAgJ0dFVCcsXG4gICAgICBleHRyYWN0RmllbGQoY2FsbGJhY2spLFxuICAgICAgJ2J1Z3MnLFxuICAgICAgbnVsbCxcbiAgICAgIHBhcmFtc1xuICAgICk7XG4gIH1cblxuICBzZWFyY2hCdWdzIChwYXJhbXMsIGNhbGxiYWNrKSB7XG4gICAgdGhpcy5BUElSZXF1ZXN0KCcvYnVnJywgJ0dFVCcsIGNhbGxiYWNrLCAnYnVncycsIG51bGwsIHBhcmFtcyk7XG4gIH1cblxuICB1cGRhdGVCdWcgKGlkLCBidWcsIGNhbGxiYWNrKSB7XG4gICAgdGhpcy5BUElSZXF1ZXN0KCcvYnVnLycgKyBpZCwgJ1BVVCcsIGNhbGxiYWNrLCAnYnVncycsIGJ1Zyk7XG4gIH1cblxuICBjcmVhdGVCdWcgKGJ1ZywgY2FsbGJhY2spIHtcbiAgICB0aGlzLkFQSVJlcXVlc3QoJy9idWcnLCAnUE9TVCcsIGNhbGxiYWNrLCAnaWQnLCBidWcpO1xuICB9XG5cbiAgYnVnQ29tbWVudHMgKGlkLCBjYWxsYmFjaykge1xuICAgIHZhciBfY2FsbGJhY2sgPSBmdW5jdGlvbihlLCByKSB7XG4gICAgICBpZiAoZSkgdGhyb3cgZTtcbiAgICAgIHZhciBfYnVnX2NvbW1lbnRzID0gcltpZF07XG4gICAgICBpZiAodHlwZW9mIF9idWdfY29tbWVudHNbJ2NvbW1lbnRzJ10gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIC8vIGJ1Z3ppbGxhIDUgOihcbiAgICAgICAgX2J1Z19jb21tZW50cyA9IF9idWdfY29tbWVudHMuY29tbWVudHM7XG4gICAgICB9XG4gICAgICBjYWxsYmFjayhudWxsLCBfYnVnX2NvbW1lbnRzKTtcbiAgICB9XG5cbiAgICB0aGlzLkFQSVJlcXVlc3QoXG4gICAgICAnL2J1Zy8nICsgaWQgKyAnL2NvbW1lbnQnLFxuICAgICAgJ0dFVCcsXG4gICAgICBfY2FsbGJhY2ssXG4gICAgICAnYnVncydcbiAgICApO1xuICB9XG5cbiAgYWRkQ29tbWVudCAoaWQsIGNvbW1lbnQsIGNhbGxiYWNrKSB7XG4gICAgdGhpcy5BUElSZXF1ZXN0KFxuICAgICAgJy9idWcvJyArIGlkICsgJy9jb21tZW50JyxcbiAgICAgICdQT1NUJyxcbiAgICAgIGNhbGxiYWNrLFxuICAgICAgbnVsbCxcbiAgICAgIGNvbW1lbnRcbiAgICApO1xuICB9XG5cbiAgYnVnSGlzdG9yeSAoaWQsIGNhbGxiYWNrKSB7XG4gICAgdGhpcy5BUElSZXF1ZXN0KFxuICAgICAgJy9idWcvJyArIGlkICsgJy9oaXN0b3J5JyxcbiAgICAgICdHRVQnLFxuICAgICAgY2FsbGJhY2ssXG4gICAgICAnYnVncydcbiAgICApO1xuICB9XG5cbiAgLyoqXG4gICAqIEZpbmRzIGFsbCBhdHRhY2htZW50cyBmb3IgYSBnaXZlbiBidWcgI1xuICAgKiBodHRwOi8vd3d3LmJ1Z3ppbGxhLm9yZy9kb2NzL3RpcC9lbi9odG1sL2FwaS9CdWd6aWxsYS9XZWJTZXJ2aWNlL0J1Zy5odG1sI2F0dGFjaG1lbnRzXG4gICAqXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBpZCBvZiBidWcuXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IFtFcnJvciwgQXJyYXk8QXR0YWNobWVudD5dLlxuICAgKi9cbiAgYnVnQXR0YWNobWVudHMgKGlkLCBjYWxsYmFjaykge1xuICAgIHRoaXMuQVBJUmVxdWVzdChcbiAgICAgICcvYnVnLycgKyBpZCArICcvYXR0YWNobWVudCcsXG4gICAgICAnR0VUJyxcbiAgICAgIGV4dHJhY3RGaWVsZChpZCwgY2FsbGJhY2spLFxuICAgICAgJ2J1Z3MnXG4gICAgKTtcbiAgfVxuXG4gIGNyZWF0ZUF0dGFjaG1lbnQgKGlkLCBhdHRhY2htZW50LCBjYWxsYmFjaykge1xuICAgIHRoaXMuQVBJUmVxdWVzdChcbiAgICAgICcvYnVnLycgKyBpZCArICcvYXR0YWNobWVudCcsXG4gICAgICAnUE9TVCcsXG4gICAgICBleHRyYWN0RmllbGQoY2FsbGJhY2spLFxuICAgICAgJ2lkcycsXG4gICAgICBhdHRhY2htZW50XG4gICAgKTtcbiAgfVxuXG4gIGdldEF0dGFjaG1lbnQgKGlkLCBjYWxsYmFjaykge1xuICAgIHRoaXMuQVBJUmVxdWVzdChcbiAgICAgICcvYnVnL2F0dGFjaG1lbnQvJyArIGlkLFxuICAgICAgJ0dFVCcsXG4gICAgICBleHRyYWN0RmllbGQoY2FsbGJhY2spLFxuICAgICAgJ2F0dGFjaG1lbnRzJ1xuICAgICk7XG4gIH1cblxuICB1cGRhdGVBdHRhY2htZW50IChpZCwgYXR0YWNobWVudCwgY2FsbGJhY2spIHtcbiAgICB0aGlzLkFQSVJlcXVlc3QoJy9idWcvYXR0YWNobWVudC8nICsgaWQsICdQVVQnLCBjYWxsYmFjaywgJ29rJywgYXR0YWNobWVudCk7XG4gIH1cblxuICBzZWFyY2hVc2VycyAobWF0Y2gsIGNhbGxiYWNrKSB7XG4gICAgdGhpcy5BUElSZXF1ZXN0KCcvdXNlcicsICdHRVQnLCBjYWxsYmFjaywgJ3VzZXJzJywgbnVsbCwge21hdGNoOiBtYXRjaH0pO1xuICB9XG5cbiAgZ2V0VXNlciAoaWQsIGNhbGxiYWNrKSB7XG4gICAgdGhpcy5BUElSZXF1ZXN0KFxuICAgICAgJy91c2VyLycgKyBpZCxcbiAgICAgICdHRVQnLFxuICAgICAgZXh0cmFjdEZpZWxkKGNhbGxiYWNrKSxcbiAgICAgICd1c2VycydcbiAgICApO1xuICB9XG5cbiAgZ2V0U3VnZ2VzdGVkUmV2aWV3ZXJzIChpZCwgY2FsbGJhY2spIHtcbiAgICAvLyBCTU8tIHNwZWNpZmljIGV4dGVuc2lvbiB0byBnZXQgc3VnZ2VzdGVkIHJldmlld2VycyBmb3IgYSBnaXZlbiBidWdcbiAgICAvLyBodHRwOi8vYnpyLm1vemlsbGEub3JnL2Jtby80LjIvdmlldy9oZWFkOi9leHRlbnNpb25zL1Jldmlldy9saWIvV2ViU2VydmljZS5wbSNMMTAyXG4gICAgdGhpcy5BUElSZXF1ZXN0KCcvcmV2aWV3L3N1Z2dlc3Rpb25zLycgKyBpZCwgJ0dFVCcsIGNhbGxiYWNrKTtcbiAgfVxuXG4gIC8qXG4gICAgWFhYIHRoaXMgY2FsbCBpcyBwcm92aWRlZCBmb3IgY29udmVuaWVuY2UgdG8gcGVvcGxlIHNjcmlwdGluZyBhZ2FpbnN0IHByb2QgYnVnemlsbHFcbiAgICBUSEVSRSBJUyBOTyBFUVVJVkFMRU5UIFJFU1QgQ0FMTCBJTiBUSVAsIHNvIHRoaXMgc2hvdWxkIG5vdCBiZSB0ZXN0ZWQgYWdhaW5zdCB0aXAsIGhlbmNlXG4gICAgdGhlIGhhcmQtY29kZWQgdXJsLlxuICAqL1xuICBnZXRDb25maWd1cmF0aW9uIChwYXJhbXMsIGNhbGxiYWNrKSB7XG4gICAgaWYgKCFjYWxsYmFjaykge1xuICAgICAgIGNhbGxiYWNrID0gcGFyYW1zO1xuICAgICAgIHBhcmFtcyA9IHt9O1xuICAgIH1cblxuICAgIC8vIHRoaXMuQVBJUmVxdWVzdCgnL2NvbmZpZ3VyYXRpb24nLCAnR0VUJywgY2FsbGJhY2ssIG51bGwsIG51bGwsIHBhcmFtcyk7XG4gICAgLy8gVUdMQVkgdGVtcCBmaXggdW50aWwgL2NvbmZpZ3VyYXRpb24gaXMgaW1wbGVtZW50ZWQsXG4gICAgLy8gc2VlIGh0dHBzOi8vYnVnemlsbGEubW96aWxsYS5vcmcvc2hvd19idWcuY2dpP2lkPTkyNDQwNSNjMTE6XG4gICAgbGV0IHRoYXQgPSB0aGlzO1xuXG4gICAgdmFyIHJlcSA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgIHJlcS5vcGVuKCdHRVQnLCAnaHR0cHM6Ly9hcGktZGV2LmJ1Z3ppbGxhLm1vemlsbGEub3JnL2xhdGVzdC9jb25maWd1cmF0aW9uJywgdHJ1ZSk7XG4gICAgcmVxLnNldFJlcXVlc3RIZWFkZXIoXCJBY2NlcHRcIiwgXCJhcHBsaWNhdGlvbi9qc29uXCIpO1xuICAgIHJlcS5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgIGlmIChyZXEucmVhZHlTdGF0ZSA9PSA0ICYmIHJlcS5zdGF0dXMgIT0gMCkge1xuICAgICAgICB0aGF0LmhhbmRsZVJlc3BvbnNlKG51bGwsIHJlcSwgY2FsbGJhY2spO1xuICAgICAgfVxuICAgIH07XG4gICAgcmVxLnRpbWVvdXQgPSB0aGlzLnRpbWVvdXQ7XG4gICAgcmVxLm9udGltZW91dCA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgdGhhdC5oYW5kbGVSZXNwb25zZSgndGltZW91dCcsIHJlcSwgY2FsbGJhY2spO1xuICAgIH07XG4gICAgcmVxLm9uZXJyb3IgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgIHRoYXQuaGFuZGxlUmVzcG9uc2UoJ2Vycm9yJywgcmVxLCBjYWxsYmFjayk7XG4gICAgfTtcbiAgICByZXEuc2VuZCgpO1xuICB9XG5cbiAgQVBJUmVxdWVzdCAocGF0aCwgbWV0aG9kLCBjYWxsYmFjaywgZmllbGQsIGJvZHksIHBhcmFtcykge1xuICAgIGlmIChcbiAgICAgIC8vIGlmIHdlIGFyZSBkb2luZyB0aGUgbG9naW5cbiAgICAgIHBhdGggPT09IExPR0lOIHx8XG4gICAgICAvLyBpZiB3ZSBhcmUgYWxyZWFkeSBhdXRoZWRcbiAgICAgIHRoaXMuX2F1dGggfHxcbiAgICAgIC8vIG9yIHdlIGFyZSBtaXNzaW5nIGF1dGggZGF0YVxuICAgICAgIXRoaXMucGFzc3dvcmQgfHwgIXRoaXMudXNlcm5hbWVcbiAgICApIHtcbiAgICAgIC8vIHNraXAgYXV0b21hdGljIGF1dGhlbnRpY2F0aW9uXG4gICAgICByZXR1cm4gdGhpcy5fQVBJUmVxdWVzdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cblxuICAgIC8vIHNvIHdlIGNhbiBwYXNzIHRoZSBhcmd1bWVudHMgaW5zaWRlIG9mIGFub3RoZXIgZnVuY3Rpb25cbiAgICBsZXQgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcblxuICAgIHRoaXMubG9naW4oZnVuY3Rpb24oZXJyKSB7XG4gICAgICBpZiAoZXJyKSByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgIHRoaXMuX0FQSVJlcXVlc3QuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfS5iaW5kKHRoaXMpKTtcbiAgfVxuXG4gIF9BUElSZXF1ZXN0IChwYXRoLCBtZXRob2QsIGNhbGxiYWNrLCBmaWVsZCwgYm9keSwgcGFyYW1zKSB7XG4gICAgbGV0IHVybCA9IHRoaXMuYXBpVXJsICsgcGF0aDtcblxuICAgIHBhcmFtcyA9IHBhcmFtcyB8fCB7fTtcblxuICAgIGlmICh0aGlzLl9hdXRoKSB7XG4gICAgICBwYXJhbXMudG9rZW4gPSB0aGlzLl9hdXRoLnRva2VuO1xuICAgIH1cbiAgICBlbHNlIGlmICh0aGlzLnVzZXJuYW1lICYmIHRoaXMucGFzc3dvcmQpIHtcbiAgICAgIHBhcmFtcy51c2VybmFtZSA9IHRoaXMudXNlcm5hbWU7XG4gICAgICBwYXJhbXMucGFzc3dvcmQgPSB0aGlzLnBhc3N3b3JkO1xuICAgIH1cblxuICAgIGlmIChwYXJhbXMgJiYgT2JqZWN0LmtleXMocGFyYW1zKS5sZW5ndGggPiAwKSB7XG4gICAgICB1cmwgKz0gXCI/XCIgKyB0aGlzLnVybEVuY29kZShwYXJhbXMpO1xuICAgIH1cblxuICAgIGJvZHkgPSBKU09OLnN0cmluZ2lmeShib2R5KTtcblxuICAgIGxldCB0aGF0ID0gdGhpcztcblxuICAgIHZhciByZXEgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICByZXEub3BlbihtZXRob2QsIHVybCwgdHJ1ZSk7XG4gICAgcmVxLnNldFJlcXVlc3RIZWFkZXIoXCJBY2NlcHRcIiwgXCJhcHBsaWNhdGlvbi9qc29uXCIpO1xuICAgIGlmIChtZXRob2QudG9VcHBlckNhc2UoKSAhPT0gXCJHRVRcIikge1xuICAgICAgcmVxLnNldFJlcXVlc3RIZWFkZXIoXCJDb250ZW50LVR5cGVcIiwgXCJhcHBsaWNhdGlvbi9qc29uXCIpO1xuICAgIH1cbiAgICByZXEub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICBpZiAocmVxLnJlYWR5U3RhdGUgPT0gNCAmJiByZXEuc3RhdHVzICE9IDApIHtcbiAgICAgICAgdGhhdC5oYW5kbGVSZXNwb25zZShudWxsLCByZXEsIGNhbGxiYWNrLCBmaWVsZCk7XG4gICAgICB9XG4gICAgfTtcbiAgICByZXEudGltZW91dCA9IHRoaXMudGltZW91dDtcbiAgICByZXEub250aW1lb3V0ID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICB0aGF0LmhhbmRsZVJlc3BvbnNlKCd0aW1lb3V0JywgcmVxLCBjYWxsYmFjayk7XG4gICAgfTtcbiAgICByZXEub25lcnJvciA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgdGhhdC5oYW5kbGVSZXNwb25zZShldmVudCwgcmVxLCBjYWxsYmFjayk7XG4gICAgfTtcbiAgICByZXEuc2VuZChib2R5KTtcbiAgfVxuXG4gIGhhbmRsZVJlc3BvbnNlIChlcnIsIHJlc3BvbnNlLCBjYWxsYmFjaywgZmllbGQpIHtcbiAgICAvLyBkZXRlY3QgdGltZW91dCBlcnJvcnNcbiAgICBpZiAoZXJyICYmIGVyci5jb2RlICYmIFRJTUVPVVRfRVJST1JTLmluZGV4T2YoZXJyLmNvZGUpICE9PSAtMSkge1xuICAgICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcigndGltZW91dCcpKTtcbiAgICB9XG5cbiAgICAvLyBoYW5kbGUgZ2VuZXJpYyBlcnJvcnNcbiAgICBpZiAoZXJyKSByZXR1cm4gY2FsbGJhY2soZXJyKTtcblxuICAgIC8vIGFueXRoaW5nIGluIDIwMCBzdGF0dXMgcmFuZ2UgaXMgYSBzdWNjZXNzXG4gICAgdmFyIHJlcXVlc3RTdWNjZXNzZnVsID0gcmVzcG9uc2Uuc3RhdHVzID4gMTk5ICYmIHJlc3BvbnNlLnN0YXR1cyA8IDMwMDtcblxuICAgIC8vIGV2ZW4gaW4gdGhlIGNhc2Ugb2YgYW4gdW5zdWNjZXNzZnVsIHJlcXVlc3Qgd2UgbWF5IGhhdmUganNvbiBkYXRhLlxuICAgIHZhciBwYXJzZWRCb2R5O1xuXG4gICAgdHJ5IHtcbiAgICAgIHBhcnNlZEJvZHkgPSBKU09OLnBhcnNlKHJlc3BvbnNlLnJlc3BvbnNlVGV4dCk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgLy8gWFhYOiBtaWdodCB3YW50IHRvIGhhbmRsZSB0aGlzIGJldHRlciBpbiB0aGUgcmVxdWVzdCBzdWNjZXNzIGNhc2U/XG4gICAgICBpZiAocmVxdWVzdFN1Y2Nlc3NmdWwpIHtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKFxuICAgICAgICAgIG5ldyBFcnJvcigncmVzcG9uc2Ugd2FzIG5vdCB2YWxpZCBqc29uOiAnICsgcmVzcG9uc2UucmVzcG9uc2VUZXh0KVxuICAgICAgICApO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIGRldGVjdCBpZiB3ZSdyZSBydW5uaW5nIEJ1Z3ppbGxhIDUuMFxuICAgIGlmICh0eXBlb2YgcGFyc2VkQm9keVsncmVzdWx0J10gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICBwYXJzZWRCb2R5ID0gcGFyc2VkQm9keVsncmVzdWx0J107XG4gICAgfVxuXG4gICAgLy8gc3VjY2Vzc2Z1bCBodHRwIHJlc3Buc2UgYnV0IGFuIGVycm9yXG4gICAgLy8gWFhYOiB0aGlzIHNlZW1zIGxpa2UgYSBidWcgaW4gdGhlIGFwaS5cbiAgICBpZiAocGFyc2VkQm9keSAmJiBwYXJzZWRCb2R5LmVycm9yKSB7XG4gICAgICByZXF1ZXN0U3VjY2Vzc2Z1bCA9IGZhbHNlO1xuICAgIH1cblxuICAgIGlmICghcmVxdWVzdFN1Y2Nlc3NmdWwpIHtcbiAgICAgIHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoXG4gICAgICAgICdIVFRQIHN0YXR1cyAnICsgcmVzcG9uc2Uuc3RhdHVzICsgJ1xcbicgK1xuICAgICAgICAvLyBub3RlIGludGVudGlvbmFsIHVzZSBvZiAhPSBpbnN0ZWFkIG9mICE9PVxuICAgICAgICAocGFyc2VkQm9keSAmJiBwYXJzZWRCb2R5Lm1lc3NhZ2UpID8gcGFyc2VkQm9keS5tZXNzYWdlIDogJydcbiAgICAgICkpO1xuICAgIH1cblxuICAgIGNhbGxiYWNrKG51bGwsIChmaWVsZCkgPyBwYXJzZWRCb2R5W2ZpZWxkXSA6IHBhcnNlZEJvZHkpO1xuICB9XG5cbiAgdXJsRW5jb2RlIChwYXJhbXMpIHtcbiAgICB2YXIgdXJsID0gW107XG4gICAgZm9yKHZhciBwYXJhbSBpbiBwYXJhbXMpIHtcbiAgICAgIHZhciB2YWx1ZXMgPSBwYXJhbXNbcGFyYW1dO1xuICAgICAgaWYoIXZhbHVlcy5mb3JFYWNoKVxuICAgICAgICB2YWx1ZXMgPSBbdmFsdWVzXTtcbiAgICAgIC8vIGV4cGFuZCBhbnkgYXJyYXlzXG4gICAgICB2YWx1ZXMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgdXJsLnB1c2goZW5jb2RlVVJJQ29tcG9uZW50KHBhcmFtKSArIFwiPVwiICtcbiAgICAgICAgICAgZW5jb2RlVVJJQ29tcG9uZW50KHZhbHVlKSk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIHVybC5qb2luKFwiJlwiKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlQ2xpZW50KG9wdGlvbnMpIHtcbiAgcmV0dXJuIG5ldyBCdWd6aWxsYUNsaWVudChvcHRpb25zKTtcbn1cbiIsImV4cG9ydCB2YXIgWE1MSHR0cFJlcXVlc3QgPSBudWxsO1xuXG5pZiAodHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgLy8gd2UncmUgbm90IGluIGEgYnJvd3Nlcj9cbiAgbGV0IF9sb2FkZXIgPSByZXF1aXJlO1xuICB0cnkge1xuICAgIFhNTEh0dHBSZXF1ZXN0ID0gX2xvYWRlcignc2RrL25ldC94aHInKS5YTUxIdHRwUmVxdWVzdDtcbiAgfSBjYXRjaChlKSB7XG4gICAgWE1MSHR0cFJlcXVlc3QgPSBfbG9hZGVyKFwieG1saHR0cHJlcXVlc3RcIikuWE1MSHR0cFJlcXVlc3Q7XG4gIH1cbn1cbmVsc2UgaWYodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIHdpbmRvdy5YTUxIdHRwUmVxdWVzdCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgWE1MSHR0cFJlcXVlc3QgPSB3aW5kb3cuWE1MSHR0cFJlcXVlc3Q7XG59XG5lbHNlIHtcbiAgdGhyb3cgXCJObyB3aW5kb3csIFdBVC5cIlxufVxuXG4iXX0=
