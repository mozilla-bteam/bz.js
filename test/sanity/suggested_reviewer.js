var bz = require("../../bz"),
    util = require('util'),
    assert = require("assert");

var bugzilla = bz.createClient({
  url: "https://bugzilla.mozilla.org/rest/"
});


bugzilla.getSuggestedReviewers(921296, function(err, result) {
  assert(Array.isArray(result));
});
