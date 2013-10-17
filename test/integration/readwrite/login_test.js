suite('create a bug', function() {
  var client;
  setup(function() {
    client = require('../support/client')();
  });

  test('invalid login', function() {
    var client = require('../../../').createClient({
      url: 'http://foobar.com'
    });

    assert.throws(function() {
      client.login(function() {});
    }, /username/);
  });

  suite('successful login', function() {
    var auth;
    setup(function(done) {
      client.login(function(err, _auth) {
        auth = _auth;
        done(err);
      });
    });

    test('aquires the token', function() {
      assert.deepEqual(client._auth, auth);
    });
  });
});

