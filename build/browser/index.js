(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.creatClient = creatClient;

var _require = require("./xhr");

var get = _require.get;
var post = _require.post;
var BugzillaClient = (function () {
  var _class = function BugzillaClient(options) {
    _classCallCheck(this, _class);

    options = options || {};
    this.username = options.username;
    this.password = options.password;
    this.timeout = options.timeout || 0;
    this.apiUrl = options.url || (options.test ? "https://bugzilla-dev.allizom.org/bzapi" : "https://bugzilla.mozilla.org/bzapi");
    this.apiUrl = this.apiUrl.replace(/\/$/, "");
  };

  _createClass(_class, [{
    key: "getBug",
    value: function getBug(id, params, callback) {
      if (!callback) {
        callback = params;
        params = {};
      }
      this.APIRequest("/bug/" + id, "GET", callback, null, null, params);
    }
  }, {
    key: "searchBugs",
    value: function searchBugs(params, callback) {
      this.APIRequest("/bug", "GET", callback, "bugs", null, params);
    }
  }, {
    key: "countBugs",
    value: function countBugs(params, callback) {
      this.APIRequest("/count", "GET", callback, "data", null, params);
    }
  }, {
    key: "updateBug",
    value: function updateBug(id, bug, callback) {
      this.APIRequest("/bug/" + id, "PUT", callback, "ok", bug);
    }
  }, {
    key: "createBug",
    value: function createBug(bug, callback) {
      this.APIRequest("/bug", "POST", callback, "ref", bug);
    }
  }, {
    key: "bugComments",
    value: function bugComments(id, callback) {
      this.APIRequest("/bug/" + id + "/comment", "GET", callback, "comments");
    }
  }, {
    key: "addComment",
    value: function addComment(id, comment, callback) {
      this.APIRequest("/bug/" + id + "/comment", "POST", callback, "ref", comment);
    }
  }, {
    key: "bugHistory",
    value: function bugHistory(id, callback) {
      this.APIRequest("/bug/" + id + "/history", "GET", callback, "history");
    }
  }, {
    key: "bugFlags",
    value: function bugFlags(id, callback) {
      this.APIRequest("/bug/" + id + "/flag", "GET", callback, "flags");
    }
  }, {
    key: "bugAttachments",
    value: function bugAttachments(id, callback) {
      this.APIRequest("/bug/" + id + "/attachment", "GET", callback, "attachments");
    }
  }, {
    key: "flagActivity",

    /**
     * Returns history for a given flag.
     * @see https://wiki.mozilla.org/BMO/REST/review#flag_activity
     * @param {Integer} id The flag id.
     * @param {Function} callback
     */
    value: function flagActivity(id, callback) {
      this.APIRequest("/review/flag_activity/" + id, "GET", callback);
    }
  }, {
    key: "createAttachment",
    value: function createAttachment(id, attachment, callback) {
      this.APIRequest("/bug/" + id + "/attachment", "POST", callback, "ref", attachment);
    }
  }, {
    key: "getAttachment",
    value: function getAttachment(id, callback) {
      this.APIRequest("/attachment/" + id, "GET", callback);
    }
  }, {
    key: "updateAttachment",
    value: function updateAttachment(id, attachment, callback) {
      this.APIRequest("/attachment/" + id, "PUT", callback, "ok", attachment);
    }
  }, {
    key: "searchUsers",
    value: function searchUsers(match, callback) {
      this.APIRequest("/user", "GET", callback, "users", null, { match: match });
    }
  }, {
    key: "getUser",
    value: function getUser(id, callback) {
      this.APIRequest("/user/" + id, "GET", callback);
    }
  }, {
    key: "getSuggestedReviewers",
    value: function getSuggestedReviewers(id, callback) {
      // BMO- specific extension to get suggested reviewers for a given bug
      // http://bzr.mozilla.org/bmo/4.2/view/head:/extensions/Review/lib/WebService.pm#L102
      this.APIRequest("/review/suggestions/" + id, "GET", callback);
    }
  }, {
    key: "getConfiguration",
    value: function getConfiguration(params, callback) {
      if (!callback) {
        callback = params;
        params = {};
      }
      this.APIRequest("/configuration", "GET", callback, null, null, params);
    }
  }, {
    key: "APIRequest",
    value: function APIRequest(path, method, callback, field, body, params) {
      var url = this.apiUrl + path;

      if (this.username && this.password) {
        params = params || {};
        params.username = this.username;
        params.password = this.password;
      }
      if (params) url += "?" + this.urlEncode(params);

      body = JSON.stringify(body);

      if (method === "GET") {
        get(url);
      } else if (method === "POST") {} else {
        throw "Unsupported HTTP method passed: " + method + ", this library currently supports POST and GET only.";
      }
    }
  }, {
    key: "handleResponse",
    value: function handleResponse(err, response, callback, field) {
      var error, json;
      if (err && err.code && (err.code == "ETIMEDOUT" || err.code == "ESOCKETTIMEDOUT")) err = "timeout";else if (err) err = err.toString();
      if (err) error = err;else if (response.status >= 300 || response.status < 200) error = "HTTP status " + response.status;else {
        try {
          json = JSON.parse(response.responseText);
        } catch (e) {
          error = "Response wasn't valid json: '" + response.responseText + "'";
        }
      }
      if (json && json.error) error = json.error.message;
      var ret;
      if (!error) {
        ret = field ? json[field] : json;
        if (field == "ref") {
          // creation returns API ref url with id of created object at end
          var match = ret.match(/(\d+)$/);
          ret = match ? parseInt(match[0]) : true;
        }
      }
      callback(error, ret);
    }
  }, {
    key: "urlEncode",
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

  return _class;
})();

exports.BugzillaClient = BugzillaClient;

function creatClient(options) {
  return new BugzillaClient(options);
}

},{"./xhr":2}],2:[function(require,module,exports){
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

},{}]},{},[1])