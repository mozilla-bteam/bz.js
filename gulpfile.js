var fs = require("fs");
var gulp = require("gulp");
var babel = require("gulp-babel");
var browserify = require("browserify");
var babelify = require("babelify");
var source = require('vinyl-source-stream');

// metadata
var pkgInfo = require('./package.json');

gulp.task("browser", gulp.series(function(done) {
  browserify({
      debug: true
    })
    .transform(babelify)
    .require('./src/bz.js', {
      entry: true
    })
    .bundle()
    .on("error", function(err) {
      console.log("Error: " + err.message);
    })
    .pipe(source('bz.js'))
    .pipe(gulp.dest('./build/browser'));
  done();
}));

gulp.task("node", gulp.series(function(done) {
  return gulp.src(['./src/index.js', './src/xhr.js'])
    .pipe(babel({
      presets: ['@babel/env']
    }))
    .pipe(gulp.dest("build/node"));
  done();
}));

gulp.task("watch", function(done) {
  return gulp.watch('./src/*.js', gulp.parallel(['default']));
  done();
});

gulp.task("default", gulp.series(["browser", "node"], function(done) {
  // copy files
  console.log("copying files...");
  fs.createReadStream('./build/browser/bz.js').pipe(fs.createWriteStream(
    './test/browser/files/bz.js'));
  fs.createReadStream('./build/browser/bz.js').pipe(fs.createWriteStream(
    './bz-' + pkgInfo.version + '.js'));

  done();
}));
