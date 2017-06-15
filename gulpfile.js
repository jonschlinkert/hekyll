
var gulp = require('gulp');
var vfs = require('vinyl-fs');
var convert = require('gulp-liquid-to-handlebars');
var hekyll = require('./');

hekyll(gulp, {
  task: 'hekyll',
  theme: 'poole',
  themes: 'vendor',
  dest: 'tmp/src'
});

gulp.task('convert', function() {
  return vfs.src('**/*.*', { cwd: 'vendor/shopify/skeleton' })
    .pipe(convert())
    .pipe(gulp.dest(function(file) {
      if (/\.(liquid|html)/.test(file.extname)) {
        file.extname = '.hbs';
      }
      return 'tmp/src';
    }))
});

gulp.task('default', ['hekyll']);
