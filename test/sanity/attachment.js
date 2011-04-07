var bz = require("../../lib/bz"),
    sys = require("sys"),
    assert = require("assert");

var bugzilla = bz.createClient({
  url: "https://api-dev.bugzilla.mozilla.org/test/0.9/",
  username: "testbzapi@gmail.com",
  password: "password"
});


bugzilla.createAttachment(9955, {
    file_name: 'test.diff',
    data: "supposedtobeencoded",
    encoding: "base64",
    description: "test patch",
    content_type: "text/plain"
  },
  function(error, id) {
    assert.ok(!error, error);
    assert.equal(typeof id, "number");
  }
);

bugzilla.getAttachment(1785, function(error, attachment) {
  assert.ok(!error, error);
  assert.ok(attachment.bug_id);
});

bugzilla.getAttachment(1785, function(error, attachment) {
  assert.ok(!error, error);

  attachment.is_patch = "1"
  bugzilla.updateAttachment(1785, attachment, function(error, ok) {
    assert.ok(!error, error);
    assert.ok(ok);
  });
});
