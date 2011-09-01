var bz = require("../../lib/bz"),
    sys = require("sys"),
    assert = require("assert");

var bugzilla = bz.createClient({
  url: "https://api-dev.bugzilla.mozilla.org/test/0.9/",
  username: "testbzapi@gmail.com",
  password: "password"
});

bugzilla.searchUsers("tom", function(error, users) {
  assert.ok(!error, error);
  assert.ok(users.length);
});

bugzilla.getUser("testbzapi@gmail.com", function(error, user) {
  assert.ok(!error, error);
  assert.ok(user.id);
});

bugzilla.getConfiguration({}, function(error, config) {
  assert.ok(!error, error);
  assert.ok(config.version);
});

bugzilla.getConfiguration(function(error, config) {
  assert.ok(!error, error);
  assert.ok(config.version);
});
