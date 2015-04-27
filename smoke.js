var bz = require('./build/node/index');

var authConfig = require('./test/browser/files/test-config.json')

console.log("authConfig", authConfig);

var client = bz.createClient(authConfig);

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

client.getConfiguration(function(err, result) {
  if (err) throw err;
  console.log("config>", result);
});