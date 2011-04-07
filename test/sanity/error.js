var bz = require("../../lib/bz"),
    sys = require("sys"),
    assert = require("assert");

var bugzilla = bz.createClient({
  url: "https://api-dev.bugzilla.mozilla.org/test/0.9/",
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