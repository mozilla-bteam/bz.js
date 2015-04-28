var bz = require('./build/node/index');
var colors = require('colors');
require('magic-constants')(global);
var authConfig = require('./test/browser/files/test-config.json');

console.log("authConfig", authConfig);

var bugzilla = bz.createClient(authConfig);

// client.login(function (err, response) {
//   console.log("this", this);
//   client.getUser(client._auth.id, function (err, user) {
//     // if (err) throw err;
//     console.log("User>", user);

//     // var bug = {
//     //   summary: 'test bug',
//     //   product: 'Firefox',
//     //   component: 'Developer Tools',
//     //   user: user,
//     //   comments: [{
//     //     text: 'something',
//     //     creator: user
//     //   }]
//     // }
//     // client.createBug(bug, function (e, r) {
//     //   if (e) throw e;
//     //   console.log("created? ", r);
//     // });
//   })
// });

// client.getConfiguration(function(err, result) {
//   if (err) throw err;
//   console.log("config>", result);
// });

// client.searchUsers("jeff@burnitall.com", function(error, users) {
//   console.log("go here 1");
//   if (error) throw error;
//   console.log("users>", users);
// });

var assert = {
  ok: function(val1, val2) {
    var ret;
    if (val2)
      ret = (val1 === val2)
    else 
      ret = !!val1

    assert._log(ret);
  },
  equal: function(val1, val2) {
    assert._log((val1 === val2));
  },
  _log: function(ok) {
    var args = [].slice.call(arguments);
    // args.shift();
    ok ? console.log(colors.green("pass> "+ok)) : console.error(colors.red("fail>", ok, __caller+':'+__caller_lineno));
  }
}

// bugzilla.getBug(6000, function(err, bug) {
//   if (err) throw err;
//   assert.ok(bug.summary);
// });

// bugzilla.bugHistory(9955, function(err, bugs) {
//   if (err) throw err;
//   assert.equal(bugs.length, 1);
//   assert.ok(bugs[0].history);
// });

// bugzilla.searchBugs({
//     summary: "window",
//     summary_type: "contains_all_words"
//   }, 
//   function(err, bugs) {
//     if (err) throw err;
//     assert.ok(bugs.length);
//   }
// );

// bugzilla.createBug({
//     product: "Firefox",
//     component: "Developer Tools",
//     summary: "it's broken",
//     version: "Trunk",
//     platform: "All",
//     op_sys: "All"
//   },
//   function(err, id) {
//     if (err) throw err;
//     assert.equal(typeof id, "number");
//   }
// );

// bugzilla.getBug(9955, function(err, bug) {
//   if (err) throw err;
//   bug = {
//      update_token: bug.update_token,
//      summary: 'new summary'
//   }
//   bugzilla.updateBug(9955, bug, function(err, ok) {
//     if (err) throw err;
//     assert.ok(ok);
//   });
// });

// // bugzilla.countBugs({
// //     summary: "windowvane",
// //     summary_type: "contains_all_words"
// //   }, 
// //   function(err, count) {
// //     if (err) throw err;
// //     assert.equal(count, 1);
// //   }
// // );

// bugzilla.bugComments(6000, function(err, comments) {
//   if (err) throw err;
//   assert.ok(comments.length);
// });

// bugzilla.addComment(6000, {
//     comment: "new comment"
//   },
//   function(err, ok) {
//     if (err) throw err;
//     assert.ok(ok);
//   }
// );

// bugzilla.bugHistory(9955, function(err, history) {
//   if (err) throw err;
//   assert.ok(history.length);
// });

// // bugzilla.bugFlags(9955, function(err, flags) {
// //   assert.ok(!err, err);
// //   assert.ok(flags.length);
// // });

// bugzilla.bugAttachments(9955, function(err, attachments) {
//   if (err) throw err;
//   assert.ok(attachments);
// });

bugzilla.bugComments(6000, function(err, comments) {
  if (err) throw err;
  console.log("comments.length>", comments.length);
});
