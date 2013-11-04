suite('bug/*/history', function() {
  var client = require('./support/client')(),
      publicClient = require('../../').createClient(),
      createBug = require('./support/create_bug');

  var bug = createBug();

  setup(function(done) {
    client.updateBug(bug.id, {
      assigned_to: require('../config.json').username,
      status: 'ASSIGNED'
    }, done);
  });

  test('#bugHistory', function(done) {
    client.bugHistory(bug.id, function(err, list) {
      assert(Array.isArray(list), 'is a list');
      assert.ok(list[0].history, 'has .history');
      done();
    });
  });
});
