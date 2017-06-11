'use strict';

var path = require('path');
var convert = require('gulp-liquid-to-handlebars');
var isValid = require('is-valid-app');
var through = require('through2');
var vfs = require('vinyl-fs');
var del = require('delete');

module.exports = function(options) {
  var opts = Object.assign({themes: 'themes'}, options);
  if (typeof opts.dest !== 'string') {
    throw new TypeError('expected options.dest to be a string');
  }

  if (typeof opts.theme !== 'string') {
    throw new TypeError('expected options.theme to be a string');
  }

  if (typeof opts.theme !== 'string') {
    throw new TypeError('expected options.theme to be a string (the name of the theme to convert)');
  }

  return function(app) {
    if (!isValid(app, 'hekyll')) return;
    var mdexts = 'markdown,mkdown,mkdn,mkd,md';

    /**
     * Paths
     */

    var taskPrefix = opts.task || 'hekyll';
    var themes = path.resolve.bind(path, opts.themes);
    var dest = path.resolve.bind(path, opts.dest);
    var cwd = themes(opts.theme);

    /**
     * Convert liquid to handlebars
     */

    templates('_layouts', '_layouts', '*.html', null, function(file) {
      wrapFrame(file, ['site', 'page']);
    });
    templates('_includes', '_includes', '*.html', null, function(file) {
      wrapFrame(file, ['site', 'page']);
    });
    templates('_drafts', '_drafts', '*.*');
    templates('_posts', '_posts', `*.{${mdexts}}`);
    templates('_pages', '', [`**/*.{html,${mdexts},textile}`, '!**/{_*/**,README*,LICENSE*}'], '_pages');

    /**
     * Copy files
     */

    copy('_config', '', '_config.yml');
    copy('_data', '_data', '**');
    copy('_sass', '_sass', '**');

    /**
     * Styles
     */

    app.task(taskPrefix + '_jekyll_styles', function() {
      return vfs.src('styles.scss', {cwd: cwd, allowEmpty: true })
        .pipe(convert({yfm: false, prefix: '@'})).on('error', console.log)
        .pipe(through.obj(function(file, enc, next) {
          var str = file.contents.toString().trim();
          file.contents = new Buffer(str + '@import "custom";\n');
          next(null, file);
        }))
        .pipe(vfs.dest(dest('_sass')));
    });

    /**
     * Root files
     */

    app.task(taskPrefix + '_jekyll_root', function() {
      return vfs.src('**/*.{xml,txt}', {cwd: cwd, allowEmpty: true })
        .pipe(convert({prefix: '@'})).on('error', console.log)
        .pipe(vfs.dest(function(file) {
          file.extname += '.hbs';
          return dest();
        }));
    });

    /**
     * Assets
     */

    app.task(taskPrefix + '_jekyll_assets', function() {
      return vfs.src('{assets,public}/**', {cwd: cwd, allowEmpty: true })
        .pipe(vfs.dest(dest()));
    });

    /**
     * Everything else
     */

    app.task(taskPrefix + '_jekyll_text', function() {
      return vfs.src([
        '**/*',
        `!**/{_*,assets,public,*.{html,txt,xml,${mdexts},scss}}`,
        '{LICENSE*,README*}'
      ], { cwd: cwd, allowEmpty: true })
        .pipe(vfs.dest(dest()));
    });

    /**
     * Custom overrides
     */

    app.task(taskPrefix + '_custom', function() {
      return vfs.src('**', {
        cwd: themes('custom', opts.theme),
        allowEmpty: true,
        dot: true
      })
        .pipe(vfs.dest(dest()));
    });

    /**
     * Cleanup
     */

    app.task(taskPrefix + '_delete', function() {
      return del(dest());
    });

    app.task(taskPrefix + '_delete-ruby-files', function() {
      return del(['**/{*.,}gem*', 'script/'], {cwd: dest(), nocase: true});
    });

    /**
     * Run all "jekyll" tasks
     */

    app.task(taskPrefix, [
      taskPrefix + '_delete',
      taskPrefix + '_jekyll_*',
      taskPrefix + '_custom',
      taskPrefix + '_delete-ruby-files'
    ]);

    /**
     * Create a task for converting templates
     */

    function templates(taskname, folder, pattern, to, fn) {
      app.task(taskPrefix + `_jekyll${taskname}`, function() {
        return vfs.src(pattern, {
          cwd: path.join(cwd, folder),
          allowEmpty: true,
          nocase: true
        })
          .pipe(convert({prefix: '@'})).on('error', console.log)
          .pipe(format()).on('error', console.log)
          .pipe(through.obj(function(file, enc, next) {
            if (fn) fn(file);
            next(null, file);
          }))
          .pipe(through.obj(function(file, enc, next) {
            var str = file.contents.toString();
            str = str.replace(/\r\n/g, '\n');
            file.contents = new Buffer(str);
            next(null, file);
          }))
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
            return dest(to || folder);
          }));
      });
    }

    function copy(taskname, folder, pattern) {
      app.task(taskPrefix + `_jekyll${taskname}`, function() {
        return vfs.src(pattern, {cwd: path.join(cwd, folder), allowEmpty: true })
          .pipe(vfs.dest(dest(folder)));
      });
    }
  };
};

function wrapFrame(file, props) {
  var str = file.contents.toString();
  if (str.slice(0, 3) !== '---') {
    var hash = props.map(function(prop) {
      return prop + '=' + prop;
    });
    str = `{{#frame ${hash.join(' ')}}}\n` + str + '{{/frame}}\n';
    file.contents = new Buffer(str);
  }
}

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
