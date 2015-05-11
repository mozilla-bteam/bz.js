var fs = require("fs");
var gulp = require("gulp");
var babel = require("gulp-babel");
var browserify = require("browserify");
var babelify = require("babelify");
var source = require('vinyl-source-stream');

// metadata
var pkgInfo = require('./package.json');

gulp.task("browser", function() {
  browserify({ 
    debug: true
  })
  .transform(babelify)
  .require('./src/bz.js', { entry: true })
  .bundle()
  .on("error", function (err) { console.log("Error: " + err.message); })
  .pipe(source('bz.js'))
  .pipe(gulp.dest('./build/browser'));
});

gulp.task("node", function () {
  return gulp.src(['./src/index.js', './src/xhr.js'])
    .pipe(babel())
    .pipe(gulp.dest("build/node"));
});

gulp.task("watch", function() {
  return gulp.watch('./src/*.js', ['default']);
});

gulp.task("default", ["browser", "node"], function() {
    // copy files
    console.log("copying files...");
    fs.createReadStream('./build/browser/bz.js').pipe(fs.createWriteStream('./test/browser/files/bz.js'));
    fs.createReadStream('./build/browser/bz.js').pipe(fs.createWriteStream('./bz-'+pkgInfo.version+'.js'));
});
