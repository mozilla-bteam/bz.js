function createBug(overrides) {
  var client = require('./client')();
  var bugFixture = require('./bug_factory')(overrides);
  var result = {
    fixture: bugFixture
  };
  setup(function(done) {
    client.createBug(bugFixture, function(err, bugNumber) {
      result.id = bugNumber;
      done(err);
    });
  });

  return result;
}

module.exports = createBug;
