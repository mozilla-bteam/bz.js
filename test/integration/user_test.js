suite('user', function() {
  var client = require('./support/client')(),
      config = require('../config.json');

  function getFirstUser() {
    var result = {};
    setup(function(done) {
      client.searchUsers(config.username, function(err, users) {
        result.raw = users;
        result.user = users[0];
        done(err);
      })
    });

    return result;
  }

  suite('#searchUsers', function() {
    var search = getFirstUser();

    test('search contains user', function(done) {
      var users = search.raw;
      assert(Array.isArray(users), 'has users');
      var user = users[0];
      assert.equal(user.name, config.username);
      done();
    });
  });

  suite('#getUser', function() {
    var search = getFirstUser();

    test('result', function(done) {
      client.getUser(search.user.id, function(err, user) {
        console.log(user);
        if (err) return done();
        assert.equal(user.name, config.username);
        done();
      });
    });
  });


});
