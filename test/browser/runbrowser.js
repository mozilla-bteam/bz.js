var connect = require('connect'),
    fs = require("fs"),
    path = require("path"),
    build = require("../../build");

var root = path.join(__dirname, "files");

build.build(path.join(root, "bz.js"));

connect.createServer(
  connect.static(root)
).listen(3000);

console.log("visit http://127.0.0.1:3000/index.html");