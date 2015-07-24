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
      // console.log("args", [].slice.call(arguments));
      if (!callback) {
        callback = params;
        params = {};
      }

      // console.log('getBug>', id, params, callback);

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvamVmZi9iei5qcy9zcmMvYnouanMiLCIvVXNlcnMvamVmZi9iei5qcy9zcmMvaW5kZXguanMiLCIvVXNlcnMvamVmZi9iei5qcy9zcmMveGhyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7OztBQ0VBLElBQUksRUFBRSxHQUFHLE1BQU0sQ0FBQyxFQUFFLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDOzs7Ozs7Ozs7OztRQ2theEIsWUFBWSxHQUFaLFlBQVk7Ozs7QUFwYTVCLElBQU0sY0FBYyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxjQUFjLENBQUM7Ozs7O0FBS3ZELElBQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQzs7Ozs7QUFLdkIsSUFBTSxjQUFjLEdBQUcsQ0FBQyxXQUFXLEVBQUUsaUJBQWlCLENBQUMsQ0FBQzs7QUFFeEQsU0FBUyxZQUFZLENBQUMsRUFBRSxFQUFFLFFBQVEsRUFBRTtBQUNsQyxNQUFJLE9BQU8sRUFBRSxLQUFLLFVBQVUsRUFBRTtBQUM1QixZQUFRLEdBQUcsRUFBRSxDQUFDO0FBQ2QsTUFBRSxHQUFHLFNBQVMsQ0FBQztHQUNoQjs7QUFFRCxTQUFPLFVBQVMsR0FBRyxFQUFFLFFBQVEsRUFBRTtBQUM3QixRQUFJLEdBQUcsRUFBRSxPQUFPLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQzs7QUFFOUIsUUFBSSxRQUFRLEVBQUU7O0FBRVosVUFBSSxFQUFFLEtBQUssU0FBUyxFQUFFO0FBQ3BCLFVBQUUsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO09BQy9CO0FBQ0QsY0FBUSxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztLQUM5QixNQUNJO0FBQ0gsWUFBTSxxQ0FBcUMsQ0FBQztL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QUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsR0FBRyxHQUFHLEdBQ3RDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7U0FDL0IsQ0FBQyxDQUFDO09BQ0o7QUFDRCxhQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7S0FDdEI7OztTQWxXUSxjQUFjO0lBbVd4QixDQUFBOztRQW5XVSxjQUFjLEdBQWQsY0FBYzs7QUFxV2xCLFNBQVMsWUFBWSxDQUFDLE9BQU8sRUFBRTtBQUNwQyxTQUFPLElBQUksY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0NBQ3BDOzs7Ozs7OztBQ3RhTSxJQUFJLGNBQWMsR0FBRyxJQUFJLENBQUM7O1FBQXRCLGNBQWMsR0FBZCxjQUFjO0FBRXpCLElBQUksT0FBTyxNQUFNLEtBQUssV0FBVyxFQUFFOztBQUVqQyxNQUFJLE9BQU8sR0FBRyxPQUFPLENBQUM7QUFDdEIsTUFBSTtBQUNGLFlBTk8sY0FBYyxHQU1yQixjQUFjLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDLGNBQWMsQ0FBQztHQUN4RCxDQUFDLE9BQU0sQ0FBQyxFQUFFO0FBQ1QsWUFSTyxjQUFjLEdBUXJCLGNBQWMsR0FBRyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxjQUFjLENBQUM7R0FDM0Q7Q0FDRixNQUNJLElBQUcsT0FBTyxNQUFNLEtBQUssV0FBVyxJQUFJLE9BQU8sTUFBTSxDQUFDLGNBQWMsS0FBSyxXQUFXLEVBQUU7QUFDckYsVUFaUyxjQUFjLEdBWXZCLGNBQWMsR0FBRyxNQUFNLENBQUMsY0FBYyxDQUFDO0NBQ3hDLE1BQ0k7QUFDSCxRQUFNLGlCQUFpQixDQUFBO0NBQ3hCIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8vIHRoaXMgZmlsZSBpcyB0aGUgZW50cnlwb2ludCBmb3IgYnVpbGRpbmcgYSBicm93c2VyIGZpbGUgd2l0aCBicm93c2VyaWZ5XG5cbnZhciBieiA9IHdpbmRvdy5ieiA9IHJlcXVpcmUoXCIuL2luZGV4XCIpOyIsImNvbnN0IFhNTEh0dHBSZXF1ZXN0ID0gcmVxdWlyZSgnLi94aHInKS5YTUxIdHRwUmVxdWVzdDtcblxuLyoqXG5Db25zdGFudCBmb3IgdGhlIGxvZ2luIGVudHJ5cG9pbnQuXG4qL1xuY29uc3QgTE9HSU4gPSAnL2xvZ2luJztcblxuLyoqXG5FcnJvcnMgcmVsYXRlZCB0byB0aGUgc29ja2V0IHRpbWVvdXQuXG4qL1xuY29uc3QgVElNRU9VVF9FUlJPUlMgPSBbJ0VUSU1FRE9VVCcsICdFU09DS0VUVElNRURPVVQnXTtcblxuZnVuY3Rpb24gZXh0cmFjdEZpZWxkKGlkLCBjYWxsYmFjaykge1xuICBpZiAodHlwZW9mIGlkID09PSAnZnVuY3Rpb24nKSB7XG4gICAgY2FsbGJhY2sgPSBpZDtcbiAgICBpZCA9IHVuZGVmaW5lZDtcbiAgfVxuXG4gIHJldHVybiBmdW5jdGlvbihlcnIsIHJlc3BvbnNlKSB7XG4gICAgaWYgKGVycikgcmV0dXJuIGNhbGxiYWNrKGVycik7XG5cbiAgICBpZiAocmVzcG9uc2UpIHtcbiAgICAgIC8vIGRlZmF1bHQgYmVoYXZpb3IgaXMgdG8gdXNlIHRoZSBmaXJzdCBpZCB3aGVuIHRoZSBjYWxsZXIgZG9lcyBub3QgcHJvdmlkZSBvbmUuXG4gICAgICBpZiAoaWQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZCA9IE9iamVjdC5rZXlzKHJlc3BvbnNlKVswXTtcbiAgICAgIH1cbiAgICAgIGNhbGxiYWNrKG51bGwsIHJlc3BvbnNlW2lkXSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdGhyb3cgXCJFcnJvcjosIG5vIHJlc3BvbnNlIGluIGV4dHJhY3RGaWVsZFwiO1xuICAgIH1cbiAgfTtcbn1cblxuLyoqXG5GdW5jdGlvbiBkZWNvcmF0b3Igd2hpY2ggd2lsbCBhdHRlbXB0IHRvIGxvZ2luIHRvIGJ1Z3ppbGxhXG53aXRoIHRoZSBjdXJyZW50IGNyZWRlbnRpYWxzIHByaW9yIHRvIG1ha2luZyB0aGUgYWN0dWFsIGFwaSBjYWxsLlxuXG4gICAgQnVnemlsbGEucHJvdG90eXBlLm1ldGhvZCA9IGxvZ2luKGZ1bmN0aW9uKHBhcmFtLCBwYXJhbSkge1xuICAgIH0pO1xuXG5AcGFyYW0ge0Z1bmN0aW9ufSBtZXRob2QgdG8gZGVjb3JhdGUuXG5AcmV0dXJuIHtGdW5jdGlvbn0gZGVjb3JhdGVkIG1ldGhvZC5cbiovXG5mdW5jdGlvbiBsb2dpblJlcXVpcmVkKG1ldGhvZCkge1xuICAvLyB3ZSBhc3N1bWUgdGhpcyBpcyBhIHZhbGlkIGJ1Z2lsbGEgaW5zdGFuY2UuXG4gIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAvLyByZW1lbWJlciB8dGhpc3wgaXMgYSBidWd6aWxsYSBpbnN0YW5jZVxuXG4gICAgLy8gYXJncyBmb3IgdGhlIGRlY29yYXRlZCBtZXRob2RcbiAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyksXG4gICAgICAgIC8vIHdlIG5lZWQgdGhlIGNhbGxiYWNrIHNvIHdlIGNhbiBwYXNzIGxvZ2luIHJlbGF0ZWQgZXJyb3JzLlxuICAgICAgICBjYWxsYmFjayA9IGFyZ3NbYXJncy5sZW5ndGggLSAxXTtcblxuICAgIHRoaXMubG9naW4oZnVuY3Rpb24oZXJyKSB7XG4gICAgICBpZiAoZXJyKSByZXR1cm4gY2FsbGJhY2soZXJyKTtcblxuICAgICAgLy8gd2UgYXJlIG5vdyBsb2dnZWQgaW4gc28gdGhlIG1ldGhvZCBjYW4gcnVuIVxuICAgICAgbWV0aG9kLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH0uYmluZCh0aGlzKSk7XG4gIH07XG59XG5cbmV4cG9ydCB2YXIgQnVnemlsbGFDbGllbnQgPSBjbGFzcyB7XG5cbiAgY29uc3RydWN0b3Iob3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgdGhpcy51c2VybmFtZSA9IG9wdGlvbnMudXNlcm5hbWU7XG4gICAgdGhpcy5wYXNzd29yZCA9IG9wdGlvbnMucGFzc3dvcmQ7XG4gICAgdGhpcy50aW1lb3V0ID0gb3B0aW9ucy50aW1lb3V0IHx8IDA7XG5cbiAgICBpZiAob3B0aW9ucy50ZXN0KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ29wdGlvbnMudGVzdCBpcyBkZXByZWNhdGVkIHBsZWFzZSBzcGVjaWZ5IHRoZSB1cmwgZGlyZWN0bHknKTtcbiAgICB9XG5cbiAgICB0aGlzLmFwaVVybCA9IG9wdGlvbnMudXJsIHx8ICdodHRwczovL2J1Z3ppbGxhLm1vemlsbGEub3JnL3Jlc3QvJztcbiAgICB0aGlzLmFwaVVybCA9IHRoaXMuYXBpVXJsLnJlcGxhY2UoL1xcLyQvLCBcIlwiKTtcblxuICAgIHRoaXMuX2F1dGggPSBudWxsO1xuICB9XG4gIC8qKlxuICBBdXRoZW50aWNhdGlvbiBkZXRhaWxzIGZvciBnaXZlbiB1c2VyLlxuXG4gIEV4YW1wbGU6XG5cbiAgICAgIHsgaWQ6IDEyMjIsIHRva2VuOiAneHh4eCcgfVxuXG4gIEB0eXBlIHtPYmplY3R9XG4gICovXG5cblxuICAvKipcbiAgSW4gdGhlIFJFU1QgQVBJIHdlIGZpcnN0IGxvZ2luIHRvIGFjcXVpcmUgYSB0b2tlbiB3aGljaCBpcyB0aGVuIHVzZWQgdG8gbWFrZVxuICByZXF1ZXN0cy4gU2VlOiBodHRwOi8vYnpyLm1vemlsbGEub3JnL2Jtby80LjIvdmlldy9oZWFkOi9CdWd6aWxsYS9XZWJTZXJ2aWNlL1NlcnZlci9SRVNULnBtI0w1NTZcblxuICBUaGlzIG1ldGhvZCBjYW4gYmUgdXNlZCBwdWJsaWNseSBidXQgaXMgZGVzaWduZWQgZm9yIGludGVybmFsIGNvbnN1bXB0aW9uIGZvclxuICBlYXNlIG9mIHVzZS5cblxuICBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBbRXJyb3IgZXJyLCBTdHJpbmcgdG9rZW5dLlxuICAqL1xuICBsb2dpbiAoY2FsbGJhY2spIHtcblxuICAgIGlmICh0aGlzLl9hdXRoKSB7XG4gICAgICBjYWxsYmFjayhudWxsLCB0aGlzLl9hdXRoKTtcbiAgICB9XG5cbiAgICBpZiAoIXRoaXMudXNlcm5hbWUgfHwgIXRoaXMucGFzc3dvcmQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignbWlzc2luZyBvciBpbnZhbGlkIC51c2VybmFtZSBvciAucGFzc3dvcmQnKTtcbiAgICB9XG5cbiAgICB2YXIgcGFyYW1zID0ge1xuICAgICAgbG9naW46IHRoaXMudXNlcm5hbWUsXG4gICAgICBwYXNzd29yZDogdGhpcy5wYXNzd29yZFxuICAgIH07XG5cbiAgICB2YXIgaGFuZGxlTG9naW4gPSBmdW5jdGlvbiBoYW5kbGVMb2dpbihlcnIsIHJlc3BvbnNlKSB7XG4gICAgICBpZiAoZXJyKSByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgdGhpcy5fYXV0aCA9IHJlc3BvbnNlLnJlc3VsdFxuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIHRoaXMuX2F1dGggPSByZXNwb25zZTtcbiAgICAgIH1cbiAgICAgIGNhbGxiYWNrKG51bGwsIHJlc3BvbnNlKTtcbiAgICB9LmJpbmQodGhpcyk7XG5cbiAgICB0aGlzLkFQSVJlcXVlc3QoJy9sb2dpbicsICdHRVQnLCBoYW5kbGVMb2dpbiwgbnVsbCwgbnVsbCwgcGFyYW1zKTtcbiAgfVxuXG4gIGdldEJ1ZyAoaWQsIHBhcmFtcywgY2FsbGJhY2spIHtcbiAgICAvLyBjb25zb2xlLmxvZyhcImFyZ3NcIiwgW10uc2xpY2UuY2FsbChhcmd1bWVudHMpKTtcbiAgICBpZiAoIWNhbGxiYWNrKSB7XG4gICAgICAgY2FsbGJhY2sgPSBwYXJhbXM7XG4gICAgICAgcGFyYW1zID0ge307XG4gICAgfVxuXG4gICAgLy8gY29uc29sZS5sb2coJ2dldEJ1Zz4nLCBpZCwgcGFyYW1zLCBjYWxsYmFjayk7XG5cbiAgICB0aGlzLkFQSVJlcXVlc3QoXG4gICAgICAnL2J1Zy8nICsgaWQsXG4gICAgICAnR0VUJyxcbiAgICAgIGV4dHJhY3RGaWVsZChjYWxsYmFjayksXG4gICAgICAnYnVncycsXG4gICAgICBudWxsLFxuICAgICAgcGFyYW1zXG4gICAgKTtcbiAgfVxuXG4gIHNlYXJjaEJ1Z3MgKHBhcmFtcywgY2FsbGJhY2spIHtcbiAgICB0aGlzLkFQSVJlcXVlc3QoJy9idWcnLCAnR0VUJywgY2FsbGJhY2ssICdidWdzJywgbnVsbCwgcGFyYW1zKTtcbiAgfVxuXG4gIHVwZGF0ZUJ1ZyAoaWQsIGJ1ZywgY2FsbGJhY2spIHtcbiAgICB0aGlzLkFQSVJlcXVlc3QoJy9idWcvJyArIGlkLCAnUFVUJywgY2FsbGJhY2ssICdidWdzJywgYnVnKTtcbiAgfVxuXG4gIGNyZWF0ZUJ1ZyAoYnVnLCBjYWxsYmFjaykge1xuICAgIHRoaXMuQVBJUmVxdWVzdCgnL2J1ZycsICdQT1NUJywgY2FsbGJhY2ssICdpZCcsIGJ1Zyk7XG4gIH1cblxuICBidWdDb21tZW50cyAoaWQsIGNhbGxiYWNrKSB7XG4gICAgdmFyIF9jYWxsYmFjayA9IGZ1bmN0aW9uKGUsIHIpIHtcbiAgICAgIGlmIChlKSB0aHJvdyBlO1xuICAgICAgdmFyIF9idWdfY29tbWVudHMgPSByW2lkXTtcbiAgICAgIGlmICh0eXBlb2YgX2J1Z19jb21tZW50c1snY29tbWVudHMnXSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgLy8gYnVnemlsbGEgNSA6KFxuICAgICAgICBfYnVnX2NvbW1lbnRzID0gX2J1Z19jb21tZW50cy5jb21tZW50cztcbiAgICAgIH1cbiAgICAgIGNhbGxiYWNrKG51bGwsIF9idWdfY29tbWVudHMpO1xuICAgIH1cblxuICAgIHRoaXMuQVBJUmVxdWVzdChcbiAgICAgICcvYnVnLycgKyBpZCArICcvY29tbWVudCcsXG4gICAgICAnR0VUJyxcbiAgICAgIF9jYWxsYmFjayxcbiAgICAgICdidWdzJ1xuICAgICk7XG5cbiAgfVxuXG4gIGFkZENvbW1lbnQgKGlkLCBjb21tZW50LCBjYWxsYmFjaykge1xuICAgIHRoaXMuQVBJUmVxdWVzdChcbiAgICAgICcvYnVnLycgKyBpZCArICcvY29tbWVudCcsXG4gICAgICAnUE9TVCcsXG4gICAgICBjYWxsYmFjayxcbiAgICAgIG51bGwsXG4gICAgICBjb21tZW50XG4gICAgKTtcbiAgfVxuXG4gIGJ1Z0hpc3RvcnkgKGlkLCBjYWxsYmFjaykge1xuICAgIHRoaXMuQVBJUmVxdWVzdChcbiAgICAgICcvYnVnLycgKyBpZCArICcvaGlzdG9yeScsXG4gICAgICAnR0VUJyxcbiAgICAgIGNhbGxiYWNrLFxuICAgICAgJ2J1Z3MnXG4gICAgKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBGaW5kcyBhbGwgYXR0YWNobWVudHMgZm9yIGEgZ2l2ZW4gYnVnICNcbiAgICogaHR0cDovL3d3dy5idWd6aWxsYS5vcmcvZG9jcy90aXAvZW4vaHRtbC9hcGkvQnVnemlsbGEvV2ViU2VydmljZS9CdWcuaHRtbCNhdHRhY2htZW50c1xuICAgKlxuICAgKiBAcGFyYW0ge051bWJlcn0gaWQgb2YgYnVnLlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbRXJyb3IsIEFycmF5PEF0dGFjaG1lbnQ+XS5cbiAgICovXG4gIGJ1Z0F0dGFjaG1lbnRzIChpZCwgY2FsbGJhY2spIHtcbiAgICB0aGlzLkFQSVJlcXVlc3QoXG4gICAgICAnL2J1Zy8nICsgaWQgKyAnL2F0dGFjaG1lbnQnLFxuICAgICAgJ0dFVCcsXG4gICAgICBleHRyYWN0RmllbGQoaWQsIGNhbGxiYWNrKSxcbiAgICAgICdidWdzJ1xuICAgICk7XG4gIH1cblxuICBjcmVhdGVBdHRhY2htZW50IChpZCwgYXR0YWNobWVudCwgY2FsbGJhY2spIHtcbiAgICB0aGlzLkFQSVJlcXVlc3QoXG4gICAgICAnL2J1Zy8nICsgaWQgKyAnL2F0dGFjaG1lbnQnLFxuICAgICAgJ1BPU1QnLFxuICAgICAgZXh0cmFjdEZpZWxkKGNhbGxiYWNrKSxcbiAgICAgICdpZHMnLFxuICAgICAgYXR0YWNobWVudFxuICAgICk7XG4gIH1cblxuICBnZXRBdHRhY2htZW50IChpZCwgY2FsbGJhY2spIHtcbiAgICB0aGlzLkFQSVJlcXVlc3QoXG4gICAgICAnL2J1Zy9hdHRhY2htZW50LycgKyBpZCxcbiAgICAgICdHRVQnLFxuICAgICAgZXh0cmFjdEZpZWxkKGNhbGxiYWNrKSxcbiAgICAgICdhdHRhY2htZW50cydcbiAgICApO1xuICB9XG5cbiAgdXBkYXRlQXR0YWNobWVudCAoaWQsIGF0dGFjaG1lbnQsIGNhbGxiYWNrKSB7XG4gICAgdGhpcy5BUElSZXF1ZXN0KCcvYnVnL2F0dGFjaG1lbnQvJyArIGlkLCAnUFVUJywgY2FsbGJhY2ssICdvaycsIGF0dGFjaG1lbnQpO1xuICB9XG5cbiAgc2VhcmNoVXNlcnMgKG1hdGNoLCBjYWxsYmFjaykge1xuICAgIHRoaXMuQVBJUmVxdWVzdCgnL3VzZXInLCAnR0VUJywgY2FsbGJhY2ssICd1c2VycycsIG51bGwsIHttYXRjaDogbWF0Y2h9KTtcbiAgfVxuXG4gIGdldFVzZXIgKGlkLCBjYWxsYmFjaykge1xuICAgIHRoaXMuQVBJUmVxdWVzdChcbiAgICAgICcvdXNlci8nICsgaWQsXG4gICAgICAnR0VUJyxcbiAgICAgIGV4dHJhY3RGaWVsZChjYWxsYmFjayksXG4gICAgICAndXNlcnMnXG4gICAgKTtcbiAgfVxuXG4gIGdldFN1Z2dlc3RlZFJldmlld2VycyAoaWQsIGNhbGxiYWNrKSB7XG4gICAgLy8gQk1PLSBzcGVjaWZpYyBleHRlbnNpb24gdG8gZ2V0IHN1Z2dlc3RlZCByZXZpZXdlcnMgZm9yIGEgZ2l2ZW4gYnVnXG4gICAgLy8gaHR0cDovL2J6ci5tb3ppbGxhLm9yZy9ibW8vNC4yL3ZpZXcvaGVhZDovZXh0ZW5zaW9ucy9SZXZpZXcvbGliL1dlYlNlcnZpY2UucG0jTDEwMlxuICAgIHRoaXMuQVBJUmVxdWVzdCgnL3Jldmlldy9zdWdnZXN0aW9ucy8nICsgaWQsICdHRVQnLCBjYWxsYmFjayk7XG4gIH1cblxuICAvKlxuICAgIFhYWCB0aGlzIGNhbGwgaXMgcHJvdmlkZWQgZm9yIGNvbnZlbmllbmNlIHRvIHBlb3BsZSBzY3JpcHRpbmcgYWdhaW5zdCBwcm9kIGJ1Z3ppbGxxXG4gICAgVEhFUkUgSVMgTk8gRVFVSVZBTEVOVCBSRVNUIENBTEwgSU4gVElQLCBzbyB0aGlzIHNob3VsZCBub3QgYmUgdGVzdGVkIGFnYWluc3QgdGlwLCBoZW5jZVxuICAgIHRoZSBoYXJkLWNvZGVkIHVybC5cbiAgKi9cbiAgZ2V0Q29uZmlndXJhdGlvbiAocGFyYW1zLCBjYWxsYmFjaykge1xuICAgIGlmICghY2FsbGJhY2spIHtcbiAgICAgICBjYWxsYmFjayA9IHBhcmFtcztcbiAgICAgICBwYXJhbXMgPSB7fTtcbiAgICB9XG5cbiAgICAvLyB0aGlzLkFQSVJlcXVlc3QoJy9jb25maWd1cmF0aW9uJywgJ0dFVCcsIGNhbGxiYWNrLCBudWxsLCBudWxsLCBwYXJhbXMpO1xuICAgIC8vIFVHTEFZIHRlbXAgZml4IHVudGlsIC9jb25maWd1cmF0aW9uIGlzIGltcGxlbWVudGVkLFxuICAgIC8vIHNlZSBodHRwczovL2J1Z3ppbGxhLm1vemlsbGEub3JnL3Nob3dfYnVnLmNnaT9pZD05MjQ0MDUjYzExOlxuICAgIGxldCB0aGF0ID0gdGhpcztcblxuICAgIHZhciByZXEgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICByZXEub3BlbignR0VUJywgJ2h0dHBzOi8vYXBpLWRldi5idWd6aWxsYS5tb3ppbGxhLm9yZy9sYXRlc3QvY29uZmlndXJhdGlvbicsIHRydWUpO1xuICAgIHJlcS5zZXRSZXF1ZXN0SGVhZGVyKFwiQWNjZXB0XCIsIFwiYXBwbGljYXRpb24vanNvblwiKTtcbiAgICByZXEub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICBpZiAocmVxLnJlYWR5U3RhdGUgPT0gNCAmJiByZXEuc3RhdHVzICE9IDApIHtcbiAgICAgICAgdGhhdC5oYW5kbGVSZXNwb25zZShudWxsLCByZXEsIGNhbGxiYWNrKTtcbiAgICAgIH1cbiAgICB9O1xuICAgIHJlcS50aW1lb3V0ID0gdGhpcy50aW1lb3V0O1xuICAgIHJlcS5vbnRpbWVvdXQgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgIHRoYXQuaGFuZGxlUmVzcG9uc2UoJ3RpbWVvdXQnLCByZXEsIGNhbGxiYWNrKTtcbiAgICB9O1xuICAgIHJlcS5vbmVycm9yID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICB0aGF0LmhhbmRsZVJlc3BvbnNlKCdlcnJvcicsIHJlcSwgY2FsbGJhY2spO1xuICAgIH07XG4gICAgcmVxLnNlbmQoKTtcbiAgfVxuXG4gIEFQSVJlcXVlc3QgKHBhdGgsIG1ldGhvZCwgY2FsbGJhY2ssIGZpZWxkLCBib2R5LCBwYXJhbXMpIHtcbiAgICBpZiAoXG4gICAgICAvLyBpZiB3ZSBhcmUgZG9pbmcgdGhlIGxvZ2luXG4gICAgICBwYXRoID09PSBMT0dJTiB8fFxuICAgICAgLy8gaWYgd2UgYXJlIGFscmVhZHkgYXV0aGVkXG4gICAgICB0aGlzLl9hdXRoIHx8XG4gICAgICAvLyBvciB3ZSBhcmUgbWlzc2luZyBhdXRoIGRhdGFcbiAgICAgICF0aGlzLnBhc3N3b3JkIHx8ICF0aGlzLnVzZXJuYW1lXG4gICAgKSB7XG4gICAgICAvLyBza2lwIGF1dG9tYXRpYyBhdXRoZW50aWNhdGlvblxuICAgICAgcmV0dXJuIHRoaXMuX0FQSVJlcXVlc3QuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG5cbiAgICAvLyBzbyB3ZSBjYW4gcGFzcyB0aGUgYXJndW1lbnRzIGluc2lkZSBvZiBhbm90aGVyIGZ1bmN0aW9uXG4gICAgbGV0IGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG5cbiAgICB0aGlzLmxvZ2luKGZ1bmN0aW9uKGVycikge1xuICAgICAgaWYgKGVycikgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICB0aGlzLl9BUElSZXF1ZXN0LmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH0uYmluZCh0aGlzKSk7XG4gIH1cblxuICBfQVBJUmVxdWVzdCAocGF0aCwgbWV0aG9kLCBjYWxsYmFjaywgZmllbGQsIGJvZHksIHBhcmFtcykge1xuICAgIGxldCB1cmwgPSB0aGlzLmFwaVVybCArIHBhdGg7XG5cbiAgICBwYXJhbXMgPSBwYXJhbXMgfHwge307XG5cbiAgICBpZiAodGhpcy5fYXV0aCkge1xuICAgICAgcGFyYW1zLnRva2VuID0gdGhpcy5fYXV0aC50b2tlbjtcbiAgICB9XG4gICAgZWxzZSBpZiAodGhpcy51c2VybmFtZSAmJiB0aGlzLnBhc3N3b3JkKSB7XG4gICAgICBwYXJhbXMudXNlcm5hbWUgPSB0aGlzLnVzZXJuYW1lO1xuICAgICAgcGFyYW1zLnBhc3N3b3JkID0gdGhpcy5wYXNzd29yZDtcbiAgICB9XG5cbiAgICBpZiAocGFyYW1zICYmIE9iamVjdC5rZXlzKHBhcmFtcykubGVuZ3RoID4gMCkge1xuICAgICAgdXJsICs9IFwiP1wiICsgdGhpcy51cmxFbmNvZGUocGFyYW1zKTtcbiAgICB9XG5cbiAgICBib2R5ID0gSlNPTi5zdHJpbmdpZnkoYm9keSk7XG5cbiAgICBsZXQgdGhhdCA9IHRoaXM7XG5cbiAgICB2YXIgcmVxID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgcmVxLm9wZW4obWV0aG9kLCB1cmwsIHRydWUpO1xuICAgIHJlcS5zZXRSZXF1ZXN0SGVhZGVyKFwiQWNjZXB0XCIsIFwiYXBwbGljYXRpb24vanNvblwiKTtcbiAgICBpZiAobWV0aG9kLnRvVXBwZXJDYXNlKCkgIT09IFwiR0VUXCIpIHtcbiAgICAgIHJlcS5zZXRSZXF1ZXN0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwiYXBwbGljYXRpb24vanNvblwiKTtcbiAgICB9XG4gICAgcmVxLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgaWYgKHJlcS5yZWFkeVN0YXRlID09IDQgJiYgcmVxLnN0YXR1cyAhPSAwKSB7XG4gICAgICAgIHRoYXQuaGFuZGxlUmVzcG9uc2UobnVsbCwgcmVxLCBjYWxsYmFjaywgZmllbGQpO1xuICAgICAgfVxuICAgIH07XG4gICAgcmVxLnRpbWVvdXQgPSB0aGlzLnRpbWVvdXQ7XG4gICAgcmVxLm9udGltZW91dCA9IGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgdGhhdC5oYW5kbGVSZXNwb25zZSgndGltZW91dCcsIHJlcSwgY2FsbGJhY2spO1xuICAgIH07XG4gICAgcmVxLm9uZXJyb3IgPSBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgIHRoYXQuaGFuZGxlUmVzcG9uc2UoZXZlbnQsIHJlcSwgY2FsbGJhY2spO1xuICAgIH07XG4gICAgcmVxLnNlbmQoYm9keSk7XG4gIH1cblxuICBoYW5kbGVSZXNwb25zZSAoZXJyLCByZXNwb25zZSwgY2FsbGJhY2ssIGZpZWxkKSB7XG4gICAgLy8gZGV0ZWN0IHRpbWVvdXQgZXJyb3JzXG4gICAgaWYgKGVyciAmJiBlcnIuY29kZSAmJiBUSU1FT1VUX0VSUk9SUy5pbmRleE9mKGVyci5jb2RlKSAhPT0gLTEpIHtcbiAgICAgIHJldHVybiBjYWxsYmFjayhuZXcgRXJyb3IoJ3RpbWVvdXQnKSk7XG4gICAgfVxuXG4gICAgLy8gaGFuZGxlIGdlbmVyaWMgZXJyb3JzXG4gICAgaWYgKGVycikgcmV0dXJuIGNhbGxiYWNrKGVycik7XG5cbiAgICAvLyBhbnl0aGluZyBpbiAyMDAgc3RhdHVzIHJhbmdlIGlzIGEgc3VjY2Vzc1xuICAgIHZhciByZXF1ZXN0U3VjY2Vzc2Z1bCA9IHJlc3BvbnNlLnN0YXR1cyA+IDE5OSAmJiByZXNwb25zZS5zdGF0dXMgPCAzMDA7XG5cbiAgICAvLyBldmVuIGluIHRoZSBjYXNlIG9mIGFuIHVuc3VjY2Vzc2Z1bCByZXF1ZXN0IHdlIG1heSBoYXZlIGpzb24gZGF0YS5cbiAgICB2YXIgcGFyc2VkQm9keTtcblxuICAgIHRyeSB7XG4gICAgICBwYXJzZWRCb2R5ID0gSlNPTi5wYXJzZShyZXNwb25zZS5yZXNwb25zZVRleHQpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIC8vIFhYWDogbWlnaHQgd2FudCB0byBoYW5kbGUgdGhpcyBiZXR0ZXIgaW4gdGhlIHJlcXVlc3Qgc3VjY2VzcyBjYXNlP1xuICAgICAgaWYgKHJlcXVlc3RTdWNjZXNzZnVsKSB7XG4gICAgICAgIHJldHVybiBjYWxsYmFjayhcbiAgICAgICAgICBuZXcgRXJyb3IoJ3Jlc3BvbnNlIHdhcyBub3QgdmFsaWQganNvbjogJyArIHJlc3BvbnNlLnJlc3BvbnNlVGV4dClcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBkZXRlY3QgaWYgd2UncmUgcnVubmluZyBCdWd6aWxsYSA1LjBcbiAgICBpZiAodHlwZW9mIHBhcnNlZEJvZHlbJ3Jlc3VsdCddICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgcGFyc2VkQm9keSA9IHBhcnNlZEJvZHlbJ3Jlc3VsdCddO1xuICAgIH1cblxuICAgIC8vIHN1Y2Nlc3NmdWwgaHR0cCByZXNwbnNlIGJ1dCBhbiBlcnJvclxuICAgIC8vIFhYWDogdGhpcyBzZWVtcyBsaWtlIGEgYnVnIGluIHRoZSBhcGkuXG4gICAgaWYgKHBhcnNlZEJvZHkgJiYgcGFyc2VkQm9keS5lcnJvcikge1xuICAgICAgcmVxdWVzdFN1Y2Nlc3NmdWwgPSBmYWxzZTtcbiAgICB9XG5cbiAgICBpZiAoIXJlcXVlc3RTdWNjZXNzZnVsKSB7XG4gICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKFxuICAgICAgICAnSFRUUCBzdGF0dXMgJyArIHJlc3BvbnNlLnN0YXR1cyArICdcXG4nICtcbiAgICAgICAgLy8gbm90ZSBpbnRlbnRpb25hbCB1c2Ugb2YgIT0gaW5zdGVhZCBvZiAhPT1cbiAgICAgICAgKHBhcnNlZEJvZHkgJiYgcGFyc2VkQm9keS5tZXNzYWdlKSA/IHBhcnNlZEJvZHkubWVzc2FnZSA6ICcnXG4gICAgICApKTtcbiAgICB9XG5cbiAgICBjYWxsYmFjayhudWxsLCAoZmllbGQpID8gcGFyc2VkQm9keVtmaWVsZF0gOiBwYXJzZWRCb2R5KTtcbiAgfVxuXG4gIHVybEVuY29kZSAocGFyYW1zKSB7XG4gICAgdmFyIHVybCA9IFtdO1xuICAgIGZvcih2YXIgcGFyYW0gaW4gcGFyYW1zKSB7XG4gICAgICB2YXIgdmFsdWVzID0gcGFyYW1zW3BhcmFtXTtcbiAgICAgIGlmKCF2YWx1ZXMuZm9yRWFjaClcbiAgICAgICAgdmFsdWVzID0gW3ZhbHVlc107XG4gICAgICAvLyBleHBhbmQgYW55IGFycmF5c1xuICAgICAgdmFsdWVzLmZvckVhY2goZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgIHVybC5wdXNoKGVuY29kZVVSSUNvbXBvbmVudChwYXJhbSkgKyBcIj1cIiArXG4gICAgICAgICAgIGVuY29kZVVSSUNvbXBvbmVudCh2YWx1ZSkpO1xuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiB1cmwuam9pbihcIiZcIik7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUNsaWVudChvcHRpb25zKSB7XG4gIHJldHVybiBuZXcgQnVnemlsbGFDbGllbnQob3B0aW9ucyk7XG59XG4iLCJleHBvcnQgdmFyIFhNTEh0dHBSZXF1ZXN0ID0gbnVsbDtcblxuaWYgKHR5cGVvZiB3aW5kb3cgPT09ICd1bmRlZmluZWQnKSB7XG4gIC8vIHdlJ3JlIG5vdCBpbiBhIGJyb3dzZXI/XG4gIGxldCBfbG9hZGVyID0gcmVxdWlyZTtcbiAgdHJ5IHtcbiAgICBYTUxIdHRwUmVxdWVzdCA9IF9sb2FkZXIoJ3Nkay9uZXQveGhyJykuWE1MSHR0cFJlcXVlc3Q7XG4gIH0gY2F0Y2goZSkge1xuICAgIFhNTEh0dHBSZXF1ZXN0ID0gX2xvYWRlcihcInhtbGh0dHByZXF1ZXN0XCIpLlhNTEh0dHBSZXF1ZXN0O1xuICB9XG59XG5lbHNlIGlmKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiB3aW5kb3cuWE1MSHR0cFJlcXVlc3QgIT09ICd1bmRlZmluZWQnKSB7XG4gIFhNTEh0dHBSZXF1ZXN0ID0gd2luZG93LlhNTEh0dHBSZXF1ZXN0O1xufVxuZWxzZSB7XG4gIHRocm93IFwiTm8gd2luZG93LCBXQVQuXCJcbn1cblxuIl19
