suite('create a bug', function() {
  var client = require('./support/client')(),
      publicClient = require('../../').createClient(),
      createBug = require('./support/create_bug');

  var firstCommentText = 'wow lots of things';
  var bug = createBug({
    description: firstCommentText
  });

  test('#bugComments - default comment', function(done) {
    client.bugComments(bug.id, function(err, list) {
      assert.ok(Array.isArray(list));
      var comment = list[0];
      assert.equal(comment.text, firstCommentText);
      done();
    });
  });

  suite('#addComment', function() {
    var newComment = 'woot';
    setup(function(done) {
      client.addComment(bug.id, {
        comment: newComment,
        id: bug.id
      }, done);
    });

    test('result', function(done) {
      client.bugComments(bug.id, function(err, list) {
        if (err) return done(err);
        assert.equal(list.length, 2);
        var comment = list[1];

        assert.equal(comment.text, newComment);
        done();
      });
    });
  });

});

