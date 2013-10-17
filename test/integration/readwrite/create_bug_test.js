suite('create a bug', function() {
  var client = require('../support/client')(),
      publicClient = require('../../../').createClient();

  // http://www.bugzilla.org/docs/tip/en/html/api/Bugzilla/WebService/Bug.html#create
  var bugFixture = {
    // these are BMO specific
    product: 'Testing',
    component: 'Marionette',
    summary: 'test bug!',
    version: 'unspecified', // this is a made up number
    op_sys: 'All',
    priority: 'P1',
    platform: 'All'
  };


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
      client.getBug(bugNumber, function(err, bugs) {
        var bug = bugs.bugs[0];

        for (var key in bugFixture) {
          assert.equal(bugFixture[key], bug[key]);
        }
        done();
      });
    });
  });
});
