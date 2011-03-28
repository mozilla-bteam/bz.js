var sys = require("sys"),
    fs = require("fs"),
    path = require("path");

function testFile(test) {
  var test = test.replace(".js", "");
  try {
    require(test);
    sys.puts("PASS " + path.basename(test));
  }
  catch(e) {
    var msg = "FAIL " + test + ": " +  e;
    if(e.expected != true)
      msg += ", expected: " + JSON.stringify(e.expected)
             + " actual: " + JSON.stringify(e.actual);
    sys.puts(msg);
  }
}

/* run all directories of tests */
fs.readdirSync(__dirname).forEach(function(file) {
  var fname = path.join(__dirname, file);
  if(file != "runtests.js")
    testFile(fname);
});
