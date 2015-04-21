var fs = require("fs");
var gulp = require("gulp");
var babel = require("gulp-babel");
var browserify = require("browserify");
var babelify = require("babelify");
var source = require('vinyl-source-stream');

gulp.task("browser", function() {
  browserify({ 
    debug: true,
    entries: './src/index.js'
  })
  .transform(babelify)
  .bundle()
  .on("error", function (err) { console.log("Error: " + err.message); })
  .pipe(source('index.js'))
  .pipe(gulp.dest('./build/browser'));
});

gulp.task("node", function () {
  return gulp.src('./src/*.js')
    .pipe(babel())
    .pipe(gulp.dest("build/node"));
});

gulp.task("default", ["browser", "node"]);
