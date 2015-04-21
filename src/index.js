let { get, post } = require('./xhr');

export var BugzillaClient = class {
  constructor(options) {
    options = options || {};
    this.username = options.username;
    this.password = options.password;
    this.timeout = options.timeout || 0;
    this.apiUrl = options.url ||
      (options.test ? "https://bugzilla-dev.allizom.org/bzapi"
                    : "https://bugzilla.mozilla.org/bzapi");
    this.apiUrl = this.apiUrl.replace(/\/$/, "");
  }

  getBug (id, params, callback) {
    if (!callback) {
       callback = params;
       params = {};
    }
    this.APIRequest('/bug/' + id, 'GET', callback, null, null, params);
  }

  searchBugs (params, callback) {
    this.APIRequest('/bug', 'GET', callback, 'bugs', null, params);
  }

  countBugs (params, callback) {
    this.APIRequest('/count', 'GET', callback, 'data', null, params);
  }

  updateBug (id, bug, callback) {
    this.APIRequest('/bug/' + id, 'PUT', callback, 'ok', bug);
  }

  createBug (bug, callback) {
    this.APIRequest('/bug', 'POST', callback, 'ref', bug);
  }

  bugComments (id, callback) {
    this.APIRequest('/bug/' + id + '/comment', 'GET', callback, 'comments');
  }

  addComment (id, comment, callback) {
    this.APIRequest('/bug/' + id + '/comment', 'POST', callback, 'ref', comment);
  }

  bugHistory (id, callback) {
    this.APIRequest('/bug/' + id + '/history', 'GET', callback, 'history');
  }

  bugFlags (id, callback) {
    this.APIRequest('/bug/' + id + '/flag', 'GET', callback, 'flags');
  }

  bugAttachments (id, callback) {
    this.APIRequest('/bug/' + id + '/attachment', 'GET', callback, 'attachments');
  }

  /**
   * Returns history for a given flag.
   * @see https://wiki.mozilla.org/BMO/REST/review#flag_activity
   * @param {Integer} id The flag id.
   * @param {Function} callback
   */
  flagActivity(id, callback) {
    this.APIRequest('/review/flag_activity/' + id, 'GET', callback);
  }

  createAttachment (id, attachment, callback) {
    this.APIRequest('/bug/' + id + '/attachment', 'POST', callback, 'ref', attachment);
  }

  getAttachment (id, callback) {
    this.APIRequest('/attachment/' + id, 'GET', callback);
  }

  updateAttachment (id, attachment, callback) {
    this.APIRequest('/attachment/' + id, 'PUT', callback, 'ok', attachment);
  }

  searchUsers (match, callback) {
    this.APIRequest('/user', 'GET', callback, 'users', null, {match: match});
  }

  getUser (id, callback) {
    this.APIRequest('/user/' + id, 'GET', callback);
  }

  getSuggestedReviewers(id, callback) {
    // BMO- specific extension to get suggested reviewers for a given bug
    // http://bzr.mozilla.org/bmo/4.2/view/head:/extensions/Review/lib/WebService.pm#L102
    this.APIRequest('/review/suggestions/' + id, 'GET', callback);
  }

  getConfiguration (params, callback) {
    if (!callback) {
       callback = params;
       params = {};
    }
    this.APIRequest('/configuration', 'GET', callback, null, null, params);
  }

  APIRequest (path, method, callback, field, body, params) {
    let url = this.apiUrl + path;

    if(this.username && this.password) {
      params = params || {};
      params.username = this.username;
      params.password = this.password;
    }
    if(params)
      url += "?" + this.urlEncode(params);

    body = JSON.stringify(body);

    if (method === 'GET') {
      get(url)
    }
    else if (method === 'POST') {

    }
    else {
      throw "Unsupported HTTP method passed: " + method + ", this library currently supports POST and GET only."
    }
  }

  handleResponse (err, response, callback, field) {
    var error, json;
    if (err && err.code && (err.code == 'ETIMEDOUT' || err.code == 'ESOCKETTIMEDOUT'))
      err = 'timeout';
    else if (err)
      err = err.toString();
    if(err)
      error = err;
    else if(response.status >= 300 || response.status < 200)
      error = "HTTP status " + response.status;
    else {
      try {
        json = JSON.parse(response.responseText);
      } catch(e) {
        error = "Response wasn't valid json: '" + response.responseText + "'";
      }
    }
    if(json && json.error)
      error = json.error.message;
    var ret;
    if(!error) {
      ret = field ? json[field] : json;
      if(field == 'ref') {// creation returns API ref url with id of created object at end
        var match = ret.match(/(\d+)$/);
        ret = match ? parseInt(match[0]) : true;
      }
    }
    callback(error, ret);
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

export function creatClient(options) {
  return new BugzillaClient(options);
}