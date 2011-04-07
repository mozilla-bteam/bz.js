var bz = require("bz");

var bugzilla = bz.createClient({
  url: "https://api-dev.bugzilla.mozilla.org/test/0.9",
  username: "testbzapi@gmail.com",
  password: "password"
});

exports.testBug = function(test) {
  bugzilla.getBug(6000, function(error, bug) {
    console.log("\n\n" + error + "\n\n");
    test.assert(!error, error);
    test.assert(bug.summary);
  });

  bugzilla.searchBugs({
      summary: "window",
      summary_type: "contains_all_words"
    }, 
    function(error, bugs) {
      test.assert(!error, error);
      test.assert(bugs.length);
    }
  );

  bugzilla.createBug({
      product: "FoodReplicator",
      component: "Salt",
      summary: "it's broken",
      version: "1.0",
      platform: "All",
      op_sys: "All"
    },
    function(error, id) {
      test.assert(!error, error);
      test.assertEqual(typeof id, "number");
    }
  );

  bugzilla.getBug(9955, function(error, bug) {
    test.assert(!error, error);
    bug.summary = "new summary";

    bugzilla.updateBug(9955, bug, function(error, ok) {
      test.assert(!error, error);
      test.assert(ok);
    });
  });

  bugzilla.countBugs({
      summary: "windowvane",
      summary_type: "contains_all_words"
    }, 
    function(error, count) {
      test.assert(!error, error);
      test.assertEqual(count, 1);
    }
  );

  bugzilla.bugComments(6000, function(error, comments) {
    test.assert(!error, error);
    test.assert(comments.length);
  });

  bugzilla.addComment(6000, {
      text: "new comment"
    },
    function(error, ok) {
      test.assert(!error, error);
      test.assert(ok);
    }
  );

  bugzilla.bugHistory(9955, function(error, history) {
    test.assert(!error, error);
    test.assert(history.length);
  });

  bugzilla.bugFlags(9955, function(error, flags) {
    test.assert(!error, error);
    test.assert(flags.length);
  });

  bugzilla.bugAttachments(9955, function(error, attachments) {
    test.assert(!error, error);
    test.assert(attachments);
  });
}

exports.testAttachment = function(test) {
  bugzilla.createAttachment(9955, {
      file_name: 'test.diff',
      data: "supposedtobeencoded",
      encoding: "base64",
      description: "test patch",
      content_type: "text/plain"
    },
    function(error, id) {
      test.assert(!error, error);
      test.assertEqual(typeof id, "number");
    }
  );

  bugzilla.getAttachment(1785, function(error, attachment) {
    test.assert(!error, error);
    test.assert(attachment.bug_id);
  });

  bugzilla.getAttachment(1785, function(error, attachment) {
    test.assert(!error, error);

    attachment.is_patch = "1"
    bugzilla.updateAttachment(1785, attachment, function(error, ok) {
      test.assert(!error, error);
      test.assert(ok);
    });
  });
}

exports.testError = function(test) {
  bugzilla.getBug(100000000000, function(error, bug) {
    test.assert(error);
  });

  bugzilla.createBug({ // empty bug
    },
    function(error, ref) {
      test.assert(error);
    }
  );
}

exports.testUser = function(test) {
  bugzilla.searchUsers("tom", function(error, users) {
    test.assert(!error, error);
    test.assert(users.length);
  });

  bugzilla.getUser("testbzapi@gmail.com", function(error, user) {
    test.assert(!error, error);
    test.assert(user.id);
  });

  bugzilla.getConfiguration({}, function(error, config) {
    test.assert(!error, error);
    test.assert(config.version);
  });
}