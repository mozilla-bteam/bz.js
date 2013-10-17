/**
Create a bugzilla client from the test config.
This should only be used when a real user is required.
*/
function createClient() {
  var Bugzilla = require('../../../');
  return Bugzilla.createClient(require('../../config.json'));
}

module.exports = createClient;
