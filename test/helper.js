global.assert = require('assert');
global.bzFactory = function() {
  var bz = require('../');

  return bz.createClient({
    url: 'https://bugzilla.mozilla.org/rest/'
  });
};
