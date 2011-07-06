var fs = require("fs"),
    browserify = require("browserify");

exports.build = function(dest) {  
  var source = browserify.bundle({
    require: __dirname + "/lib/bz.js",
    ignore: ['request', 'xhr']
  });
  source = "var bz = (function() {" + source + " return require('/bz')})();";
  
  fs.writeFileSync(dest, source);
}