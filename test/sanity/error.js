var bz = require("../../bz"),
    util = require('util'),
    assert = require("assert");

var bugzilla = bz.createClient({
  url: "https://api-dev.bugzilla.mozilla.org/test/latest/",
  username: "testbzapi@gmail.com",
  password: "password"
});


bugzilla.getBug(100000000000, function(error, bug) {
  assert.ok(error);
});

bugzilla.createBug({ /* empty bug */ },
  function(error, ref) {
    assert.ok(error);
  }
);

bugzilla = bz.createClient({
  url: "https://api-dev.bugzilla.mozilla.org/test/latest/",
  username: "testbzapi@gmail.com",
  password: "password",
  timeout: 1 // ensure the request will timeout
});

bugzilla.getConfiguration(function (error, config) {
  assert.equal("timeout", error);
});
