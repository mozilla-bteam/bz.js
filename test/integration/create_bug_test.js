suite('create a bug', function() {
  var client = require('./support/client')(),
      publicClient = require('../../').createClient();

  // http://www.bugzilla.org/docs/tip/en/html/api/Bugzilla/WebService/Bug.html#create
  var bugFixture = require('./support/bug_factory')();

  test('unauthorized createBug', function() {
    assert.throws(function() {
      publicClient.createBug({}, function() {});
    }, /username/);
  });

  suite('create bug', function() {
    var bugNumber;
    setup(function(done) {
      client.createBug(bugFixture, function(err, _bugNumber) {
        bugNumber = _bugNumber;
        done(err);
      });
    });

    test('saves bug', function(done) {
      client.getBug(bugNumber, function(err, bug) {
        for (var key in bugFixture) {
          assert.equal(bugFixture[key], bug[key]);
        }
        done();
      });
    });
  });
});
