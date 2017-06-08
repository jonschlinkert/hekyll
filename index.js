'use strict';

var path = require('path');
var vfs = require('vinyl-fs');
var del = require('delete');
var through = require('through2');
var convert = require('gulp-liquid-to-handlebars');

module.exports = function(prefix, cwd, dest) {
  var theme = path.basename(cwd);

  return function(app) {
    if (!this.isApp) return;
    var mdexts = 'markdown,mkdown,mkdn,mkd,md';
    var vendor = path.resolve.bind(path, __dirname, 'vendor');
    var src = path.resolve.bind(path, dest);

    /**
     * Convert liquid to handlebars
     */

    templates('_layouts', '_layouts', '*.html');
    templates('_includes', '_includes', '*.html');
    templates('_drafts', '_drafts', '*.*');
    templates('_posts', '_posts', `*.{${mdexts}}`);
    templates('_pages', '', [`**/*.{html,${mdexts},textile}`, '!**/{_*/**,README*,LICENSE*}'], '_pages');

    copy('_config', '', '_config.yml');
    copy('_data', '_data', '**');
    copy('_sass', '_sass', '**');

    /**
     * Styles
     */

    app.task(prefix + '_jekyll_styles', function() {
      return vfs.src('styles.scss', {cwd: cwd, allowEmpty: true })
        .pipe(convert({yfm: false})).on('error', console.log)
        .pipe(through.obj(function(file, enc, next) {
          file.contents = new Buffer(file.contents.toString() + '@import "custom";');
          next(null, file);
        }))
        .pipe(vfs.dest(src('_sass')));
    });

    /**
     * Root files
     */

    app.task(prefix + '_jekyll_root', function() {
      return vfs.src('**/*.{xml,txt}', {cwd: cwd, allowEmpty: true })
        .pipe(convert()).on('error', console.log)
        .pipe(vfs.dest(function(file) {
          file.extname += '.hbs';
          return src();
        }));
    });

    /**
     * Assets
     */

    app.task(prefix + '_jekyll_assets', function() {
      return vfs.src('{assets,public}/**', {cwd: cwd, allowEmpty: true })
        .pipe(vfs.dest(src()));
    });

    /**
     * Everything else
     */

    app.task(prefix + '_jekyll_text', function() {
      return vfs.src([
        '**/*',
        `!**/{_*,assets,public,*.{html,txt,xml,${mdexts},scss}}`,
        '{LICENSE*,README*}'
      ], {cwd: cwd, allowEmpty: true })
        .pipe(vfs.dest(dest));
    });

    /**
     * Custom overrides
     */

    app.task(prefix + '_custom', function() {
      return vfs.src('**', {cwd: vendor('custom', theme), allowEmpty: true, dot: true })
        .pipe(vfs.dest(src()));
    });

    /**
     * Cleanup
     */

    app.task(prefix + '_delete', function() {
      return del.promise(dest);
    });

    app.task(prefix + '_delete-ruby-files', function() {
      return del.promise(['**/{*.,}gem*', 'script/'], {cwd: dest, nocase: true});
    });

    /**
     * Run all "jekyll" tasks
     */

    app.task(prefix, [
      prefix + '_delete',
      prefix + '_jekyll_*',
      prefix + '_custom',
      prefix + '_delete-ruby-files'
    ]);

    /**
     * Create a task for converting templates
     */

    function templates(taskname, folder, pattern, to) {
      app.task(prefix + `_jekyll${taskname}`, function() {
        return vfs.src(pattern, {
          cwd: path.join(cwd, folder),
          allowEmpty: true,
          nocase: true
        })
          .pipe(convert()).on('error', console.log)
          .pipe(format())
          .pipe(vfs.dest(function(file) {
            var ext = file.extname;
            switch (ext) {
              case '.html':
                file.extname = '.hbs';
                break;
              case '.markdown':
              case '.mkdown':
              case '.mkdn':
              case '.mkd':
              case '.md':
                file.extname = '.md';
                break;
              case '.yaml':
                file.extname = '.yml';
                break;
            }
            return src(to || folder);
          }));
      });
    }

    function copy(taskname, folder, pattern) {
      app.task(prefix + `_jekyll${taskname}`, function() {
        return vfs.src(pattern, {cwd: path.join(cwd, folder), allowEmpty: true })
          .pipe(vfs.dest(src(folder)));
      });
    }
  };
};

function format() {
  return through.obj(function(file, enc, next) {
    if (file.isNull()) {
      next();
      return;
    }

    var str = file.contents.toString();

    // fix main `styles.css` path
    str = str.replace(/\/(?=styles\.css)/, '/assets/css/');

    // strip leading indentation before {{markdown}} tags
    str = str.replace(/^\s+(\{\{(\/|#)?(?:markdown|md))/gm, '$1');

    file.contents = new Buffer(str);
    next(null, file);
  });
}
