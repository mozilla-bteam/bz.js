suite('create a bug', function() {
  var client = require('./support/client')(),
      publicClient = require('../../').createClient();

  // http://www.bugzilla.org/docs/tip/en/html/api/Bugzilla/WebService/Bug.html#create

  function createBug(overrides) {
    var bugFixture = require('./support/bug_factory')(overrides);
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

  test('unauthorized createBug', function() {
    assert.throws(function() {
      publicClient.createBug({}, function() {});
    }, /username/);
  });

  test('invalid bug', function(done) {
    client.createBug({}, function(err, res) {
      assert.ok(err, 'has an error');
      done();
    });
  });

  test('#getBug - missing bug', function(done) {
    client.getBug(1000000000, function(err) {
      assert.ok(err, 'has error');
      done();
    });
  });

  suite('#createBug', function() {
    var record = createBug();

    test('saves bug', function(done) {
      client.getBug(record.id, function(err, bug) {
        assert.ok(!err, 'is successful');
        for (var key in record.fixture) {
          assert.equal(record.fixture[key], bug[key]);
        }
        done();
      });
    });
  });

  suite('#updateBug', function() {
    var record = createBug();
    var original;

    setup(function(done) {
      client.getBug(record.id, function(err, bug) {
        original = bug;
        done(err);
      });
    });

    var newSummary = 'i haz changed';
    var updated;
    setup(function(done) {
      updated = {};
      updated.summary = newSummary;

      // this only checks the simple case where we update using a primitive.
      client.updateBug(record.id, updated, function(err, changes) {
        assert(Array.isArray(changes), 'responds with changes');
        done(err);
      });
    });

    test('verify update', function(done) {
      client.getBug(record.id, function(err, bug) {
        for (var key in updated) {
          assert.deepEqual(bug[key], updated[key]);
        }
        done(err);
      });
    });
  });

  suite('#searchBugs', function() {
    var term = 'izmagicall-' + Date.now();
    var record = createBug({
      summary: term
    });

    test('search results', function(done) {
      client.searchBugs({ summary: term }, function(err, result) {
        assert(Array.isArray(result));
        var bug = result[0];
        assert.equal(bug.id, record.id);
        done(err);
      });
    });
  });
});
