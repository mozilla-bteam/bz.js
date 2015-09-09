var assert = require('assert');
var bz = require('../build/node/index');
var authConfig = require('./browser/files/test-config.json');

var bugzilla;

// Bugs
describe('bz.js basic bug wrangling', function() {

  before(function() {
    bugzilla = bz.createClient(authConfig);
  });

  it('tests getting a bug', function(done) {
    bugzilla.getBug(6000, function(err, bug) {
      if (err) throw err;
      assert.ok(bug.summary);
      done();
    });
  });

  it('tests getting bug history field', function(done) {
    bugzilla.bugHistory(9955, function(err, bugs) {
      if (err) throw err;
      assert.equal(bugs.length, 1);
      assert.ok(bugs[0].history);
      done();
    });
  });

  it('tests searching for a bug', function(done) {
    bugzilla.searchBugs({
        summary: "window",
        summary_type: "contains_all_words"
      },
      function(err, bugs) {
        if (err) throw err;
        assert.ok(bugs.length);
        done();
      }
    );
  });

  // XXX this doesn't work, probably a bug in bugzilla. error is related
  // XXX to op_sys field:
  // XXX "Uncaught Error: You must select/enter a OS."
  it('tests creating a bug from scratch', function(done) {
    var _tpl = {
      product: 'FoodReplicator',
      component: 'SaltSprinkler',
      summary: 'Test whiteboard bug',
      whiteboard: '[devedition-40]',
      op_sys: 'Linux',
      platform: 'PC',
      version: '1.0'
    };
    bugzilla.createBug(_tpl,
      function(err, id) {
        if (err) throw err;
        assert.equal(typeof id, "number");
        done();
      }
    );
  });

  // XXX this test needs to create a bug in order to update it.
  it('tests updating a bug with a new whiteboard', function(done) {
    bug = {
       whiteboard: '[test-whiteboard]'
    }
    bugzilla.updateBug(9955, bug, function(err, ok) {
      if (err) throw err;
      assert.ok(ok);
      done();
    });
  });

  it('tests getting bug comments', function(done) {
    bugzilla.bugComments(6000, function(err, comments) {
      if (err) throw err;
      assert.ok(comments.length);
      done();
    });
  });

  it('tests adding a comment to an existing bug', function(done) {
    bugzilla.addComment(6000, {
        comment: "new comment"
      },
      function(err, ok) {
        if (err) throw err;
        assert.ok(ok);
        done();
      }
    );
  });

  it('tests the bugHistory call', function(done) {
    bugzilla.bugHistory(9955, function(err, history) {
      if (err) throw err;
      assert.ok(history.length);
      done();
    });
  });

  it('tests getting bug attachments', function(done) {
    bugzilla.bugAttachments(9955, function(err, attachments) {
      if (err) throw err;
      assert.ok(attachments);
      done();
    });
  });
});

// Users
describe('bz.js users tests', function() {
  before(function() {
    bugzilla = bz.createClient(authConfig);
  });

  it('search users', function(done) {
    bugzilla.searchUsers("jeff@burnitall.com", function(error, users) {
      if (error) throw error;
      assert.ok(users.length);
      done();
    });
  });

  it('gets a user', function(done) {
    bugzilla.getUser("jeff@burnitall.com", function(error, user) {
      if (error) throw error;
      assert.ok(user.id);
      done();
    });
  });


  // XXX currently there is no REST endpoint for this, the bzapi proxy is crappy and slow.
  // it('gets the server configuration', function(done) {
  //   console.log("running config");
  //   bugzilla.getConfiguration(function(error, config) {
  //     console.log("go here 2");
  //     if (error) throw error;
  //     assert.ok(config.version);
  //     done();
  //   });
  // });
});

describe('tests attachments', function() {
  before(function() {
    bugzilla = bz.createClient(authConfig);
  });

  it('tests adding an attachment', function(done) {
    bugzilla.createAttachment(9955, {
        file_name: 'test.diff',
        summary: "Test Attachment",
        data: "supposedtobeencoded",
        encoding: "base64",
        description: "this is a test patch",
        comment: "this is the comment",
        content_type: "text/plain"
      },
      function(err, id) {
        if (err) throw err;
        assert.equal(typeof id, "string");
        done();
      }
    );
  });

  it('tests getting an attachment', function(done) {
    bugzilla.getAttachment(1785, function(err, attachment) {
      if (err) throw err;
      assert.ok(attachment.bug_id);
      done();
    });
  });

  it('tests updating an attachment', function(done) {
    bugzilla.getAttachment(1785, function(err, attachment) {
      if (err) throw err;

      attachment.is_patch = "1"
      bugzilla.updateAttachment(1785, attachment, function(error) {
        if (err) throw err;
        // console.log("updateAttachment>", [].slice.call(arguments));
        // assert.ok(error);
        done();
      });
    });
  });
});

describe('test using an api_key', function() {
  var bugzilla;
  before(function() {
    bugzilla = bz.createClient({
      api_key: 'zWHkdtvzAwoG2AfQMcTfyJdIWRUPVyJzgszM3g1Z',
      "url": "https://landfill.bugzilla.org/bugzilla-tip/rest/",
    });
  });

  it('tests changing a bug using only an api_key', function(done) {
    bugzilla.updateBug('27114', {url: 'https://landfill.bugzilla.org/bugzilla-tip/show_bug.cgi?id=27114'}, function(err, result) {
      if (err) throw err;
      assert.ok(true);
      done();
    });
  });
});
