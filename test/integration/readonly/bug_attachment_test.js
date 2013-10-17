suite('bug attachment', function() {
  var bz = require('../../../').createClient();

  test('success', function(done) {
    bz.bugAttachments(835285, function(error, attachments) {
      assert(
        Array.isArray(attachments),
        'responds with an array of attachments'
      );

      done(error);
    });
  });
});
