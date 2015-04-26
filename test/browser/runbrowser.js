var connect = require('connect'),
    serveStatic = require('serve-static'),
    path = require("path");

var root = path.join(__dirname, "files");

var server = connect();
var PORT = process.env.PORT || 3000;
server
  .use(serveStatic(root))
  .listen(PORT, function() {
    console.log("Visit http://127.0.0.1:%d/index.html", PORT);
  });
