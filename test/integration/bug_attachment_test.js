suite('create bug attachment', function() {
  var client = require('./support/client')(),
      bugFixture = require('./support/bug_factory')(),
      bugNumber;

  setup(function(done) {
    client.createBug(bugFixture, function(err, _bugNumber) {
      bugNumber = _bugNumber;
      done(err);
    });
  });

  suite('single attachment', function() {
    var attachmentId;
    setup(function(done) {
      client.createAttachment(
        bugNumber,
        {
          file_name: 'test.diff',
          data: 'supposedtobeencoded',
          encoding: 'base64',
          summary: 'test patch',
          content_type: 'text/plain'
        },
        function(err, attachment) {
          if (err) return done(err);
          assert.equal(attachment.bug_id, bugNumber);
          attachmentId = attachment.id;
          done();
        }
      );
    });

    test('#getAttachment', function(done) {
      client.getAttachment(attachmentId, function(error, attachment) {
        assert.ok(!error, error);
        assert.equal(attachment.bug_id, bugNumber);
        done();
      });
    });

    test('#bugAttachments', function(done) {
      client.bugAttachments(bugNumber, function(error, attachments) {
        if (error) return done(error);
        assert(Array.isArray(attachments), 'is an array')
        var attachment = attachments[0];
        assert.equal(attachment.id, attachmentId);
        done();
      });
    });

    suite('update attachment', function() {
      var newSummary = 'wootchanged';
      setup(function(done) {
        client.updateAttachment(attachmentId, {
          summary: newSummary
        }, done)
      });

      test('changed attachment', function(done) {
        client.getAttachment(attachmentId, function(err, attachment) {
          if (err) return done(err);
          assert.equal(attachment.summary, newSummary);
          done();
        });
      });

    });
  });
});
