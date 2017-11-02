import r2 from 'r2';
import { stringify } from 'query-string';

// Constant for the login entrypoint.
const LOGIN = '/login';
const JSON_CONTENT = /^(application\/(json|x-javascript)|text\/(x-)?javascript|x-json)(;.*)?$/;

export class BugzillaClient {
  constructor(options = {}) {
    this.options = {
      apiKey: null,
      url: 'https://bugzilla.mozilla.org/rest/',
      ...options
    };

    if (options.test) {
      throw new Error('options.test is deprecated; please specify the URL directly');
    }

    this.options.url = this.options.url.replace(/\/$/, '');
    this._auth = null;
  }

  async request(opts) {
    const options = { ...opts };
    // If the path is not /login, let's try logging
    // in prior to the real request if we have credentials
    if (
      !options.path.startsWith(LOGIN) &&
      !this._auth &&
      this.options.password &&
      this.options.username
    ) {
      await this.login();
    }

    if (!options.search) {
      options.search = {};
    }

    if (!options.headers) {
      options.headers = {};
    }

    if (this.options.apiKey) {
      options.headers['X-BUGZILLA-API-KEY'] = this.options.apiKey;
    }

    if (this._auth) {
      options.search.token = this._auth.token;
    } else if (this.options.username && this.options.password) {
      options.search.login = this.options.username;
      options.search.password = this.options.password;
    }

    const stringified = stringify(options.search);
    const queryString = stringified && `?${stringified}`;

    if (options.body) {
      options.json = options.body;
      delete options.body;
    }

    const response = await r2(`${this.options.url}${options.path}${queryString}`, options).response;
    const data = await (JSON_CONTENT.test(response.headers.get('Content-Type')) ? response.json() : null);

    if (response.ok) {
      return data;
    }

    return Promise.reject(Object.assign(new Error(response.statusText), {
      response,
      body: data
    }));
  }

  async login() {
    if (this._auth) {
      return Promise.resolve(this._auth);
    }

    const { username, password } = this.options;

    if (!username || !password) {
      throw new Error('missing or invalid options "username" or "password"');
    }

    const response = await this.request({ path: LOGIN });

    this._auth = response.result;
    return response;
  }

  async getBug(id, search, options = {}) {
    const { bugs } = await this.request({
      path: `/bug/${id}`,
      search,
      ...options
    });

    return bugs[0];
  }

  async searchBugs(search, options = {}) {
    const { bugs } = await this.request({
      path: '/bug',
      search,
      ...options
    });

    return bugs;
  }

  async updateBug(id, bug, options = {}) {
    const { bugs } = await this.request({
      path: `/bug/${id}`,
      method: 'put',
      body: bug,
      ...options
    });

    return bugs;
  }

  async createBug(bug, options = {}) {
    const { id } = await this.request({
      path: '/bug',
      method: 'post',
      body: bug,
      ...options
    });

    return id;
  }

  async bugComments(id, options = {}) {
    const { bugs } = await this.request({
      path: `/bug/${id}/comment`,
      ...options
    });
    const comments = bugs[id];

    return comments.comments || comments;
  }

  addComment(id, comment, options = {}) {
    return this.request({
      path: `/bug/${id}/comment`,
      body: comment,
      method: 'post',
      ...options
    });
  }

  async bugHistory(id, options = {}) {
    const { bugs } = await this.request({
      path: `/bug/${id}/history`,
      ...options
    });

    return bugs;
  }

  /**
   * Finds all attachments for a given bug number
   * http://www.bugzilla.org/docs/tip/en/html/api/Bugzilla/WebService/Bug.html#attachments
   *
   * @param {Number} id
   * @param {Object} options: request options
   * @returns {Promise.<Array<Attachment>}
   */
  async bugAttachments(id, options = {}) {
    const { bugs } = await this.request({
      path: `/bug/${id}/attachment`,
      ...options
    });

    return bugs[id];
  }

  async createAttachment(id, attachment, options = {}) {
    return this.request({
      path: `/bug/${id}/attachment`,
      body: attachment,
      method: 'post',
      ...options
    });
  }

  async getAttachment(id, options = {}) {
    const { attachments } = await this.request({
      path: `/bug/attachment/${id}`,
      ...options
    });

    return attachments[0];
  }

  updateAttachment(id, attachment, options = {}) {
    return this.request({
      path: `/bug/attachment/${id}`,
      body: attachment,
      method: 'put',
      ...options
    });
  }

  async searchUsers(match, options = {}) {
    const { users } = await this.request({
      path: '/user',
      search: { match },
      ...options
    });

    return users;
  }

  async getUser(id, options = {}) {
    const { users } = await this.request({
      path: `/user/${id}`,
      ...options
    });

    return users[0];
  }

  // BMO- specific extension to get suggested reviewers for a given bug
  // http://bzr.mozilla.org/bmo/4.2/view/head:/extensions/Review/lib/WebService.pm#L102
  getSuggestedReviewers(id) {
    return this.request({
      path: `/review/suggestions/${id}`
    });
  }

  /*
    XXX this call is provided for convenience to people scripting against prod bugzillq
    THERE IS NO EQUIVALENT REST CALL IN TIP, so this should not be tested against tip, hence
    the hard-coded url.
  */
  getConfiguration(search, options = {}) {
    // TODO: Temporary fix until /configuration is implemented,
    // see https://bugzilla.mozilla.org/show_bug.cgi?id=924405#c11:
    return r2('https://api-dev.bugzilla.mozilla.org/latest/configuration', options).json;
  }

  getProducts(product, options = {}) {
    const queryable = ['selectable', 'enterable', 'accessible'];

    if (queryable.includes(product)) {
      return this.request({ path: 'product', search: { type: product }, ...options });
    }

    return this.request({ path: `/product/${product}`, ...options });
  }

  getProduct(product, options = {}) {
    return this.request({
      path: `/product/${product}`,
      ...options
    });
  }


}

export const createClient = (options) => new BugzillaClient(options);
