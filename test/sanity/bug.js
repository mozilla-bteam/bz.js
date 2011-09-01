var bz = require("../../lib/bz"),
    sys = require("sys"),
    assert = require("assert");

var bugzilla = bz.createClient({
  url: "https://api-dev.bugzilla.mozilla.org/test/0.9/",
  username: "testbzapi@gmail.com",
  password: "password"
});


bugzilla.getBug(6000, function(error, bug) {
  assert.ok(!error, error);
  assert.ok(bug.summary);
});

bugzilla.getBug(6000, {include_fields: "history"}, function(error, bug) {
  assert.ok(!error, error);
  assert.ok(bug.history);
});

bugzilla.searchBugs({
    summary: "window",
    summary_type: "contains_all_words"
  }, 
  function(error, bugs) {
    assert.ok(!error, error);
    assert.ok(bugs.length);
  }
);

bugzilla.createBug({
    product: "FoodReplicator",
    component: "Salt",
    summary: "it's broken",
    version: "1.0",
    platform: "All",
    op_sys: "All"
  },
  function(error, id) {
    assert.ok(!error, error);
    assert.equal(typeof id, "number");
  }
);

bugzilla.getBug(9955, function(error, bug) {
  assert.ok(!error, error);
  bug = {
     update_token: bug.update_token,
     summary: 'new summary'
  }
  bugzilla.updateBug(9955, bug, function(error, ok) {
    assert.ok(!error, error);
    assert.ok(ok);
  });
});

bugzilla.countBugs({
    summary: "windowvane",
    summary_type: "contains_all_words"
  }, 
  function(error, count) {
    assert.ok(!error, error);
    assert.equal(count, 1);
  }
);

bugzilla.bugComments(6000, function(error, comments) {
  assert.ok(!error, error);
  assert.ok(comments.length);
});

bugzilla.addComment(6000, {
    text: "new comment"
  },
  function(error, ok) {
    assert.ok(!error, error);
    assert.ok(ok);
  }
);

bugzilla.bugHistory(9955, function(error, history) {
  assert.ok(!error, error);
  assert.ok(history.length);
});

bugzilla.bugFlags(9955, function(error, flags) {
  assert.ok(!error, error);
  assert.ok(flags.length);
});

bugzilla.bugAttachments(9955, function(error, attachments) {
  assert.ok(!error, error);
  assert.ok(attachments);
});

