'use strict';

var path = require('path');
var isBinary = require('file-is-binary');
var convert = require('gulp-liquid-to-handlebars');
var through = require('through2');
var vfs = require('vinyl-fs');
var del = require('delete');

module.exports = function(app, options) {
  var opts = Object.assign({themes: 'themes'}, options);

  if (typeof opts.dest !== 'string') {
    throw new TypeError('expected options.dest to be a string');
  }
  if (typeof opts.theme !== 'string') {
    throw new TypeError('expected options.theme to be a string (the name of the theme to convert)');
  }

  /**
   * Build variables
   */

  var taskName = opts.task || 'hekyll';
  var mdexts = 'markdown,mkdown,mkdn,mkd,md';
  var themes = path.resolve.bind(path, opts.themes);
  var overrides = themes('overrides', opts.theme);
  var dest = path.resolve.bind(path, opts.dest);
  var cwd = themes(opts.theme);
  var tasks = [];

  /**
   * Convert liquid to handlebars
   */

  templates('layouts', '_layouts', '*.{html,liquid}', null, function(file) {
    wrapFrame(file, ['site', 'page']);
  });
  templates('includes', '_includes', '*.{html,liquid}', null, function(file) {
    wrapFrame(file, ['site', 'page']);
  });
  templates('drafts', '_drafts', '*.*');
  templates('posts', '_posts', `*.{${mdexts},html,liquid}`);
  templates('pages', '', [`*.{html,${mdexts},textile,liquid}`, '!**/{_*/**,README*,LICENSE*}'], '_pages');

  /**
   * Copy files
   */

  copy('config', '', '_config.yml');
  copy('data', '_data', '**');
  copy('sass', '_sass', '**');

  /**
   * Styles
   */

  app.task('styles', function() {
    return vfs.src('styles.scss', {cwd: cwd, allowEmpty: true })
      .pipe(stripEmptyMatter())
      .pipe(convert({yfm: false, prefix: '@'})).on('error', console.log)
      .pipe(addImport())
      .pipe(vfs.dest(function(file) {
        file.extname = file.extname.replace(/liquid/, 'hbs');
        return dest('_sass');
      }));
  });

  /**
   * Root files
   */

  app.task('root', function() {
    return vfs.src('**/*.{xml,txt}', {cwd: cwd, allowEmpty: true })
      .pipe(stripEmptyMatter())
      .pipe(convert({prefix: '@'})).on('error', console.log)
      .pipe(vfs.dest(function(file) {
        file.extname = file.extname.replace(/liquid/, '');
        file.extname += '.hbs';
        return dest();
      }));
  });

  /**
   * Assets
   */

  app.task('assets', function() {
    return vfs.src('{assets,public}/**', {cwd: cwd, allowEmpty: true })
      .pipe(vfs.dest(dest()));
  });

  /**
   * Everything else
   */

  app.task('text', function() {
    return vfs.src([
      '**/*',
      `!**/{_*,assets,public,*.{liquid,html,txt,xml,${mdexts},scss}}`,
      '{LICENSE*,README*}'
    ], { cwd: cwd, allowEmpty: true })
      .pipe(stripEmptyMatter())
      .pipe(vfs.dest(dest()));
  });

  /**
   * Custom overrides
   */

  app.task('overrides', function() {
    return vfs.src('**', {cwd: overrides, allowEmpty: true, dot: true})
      .pipe(stripEmptyMatter())
      .pipe(vfs.dest(dest()));
  });

  /**
   * Cleanup
   */

  app.task('delete-ruby-files', function() {
    return del(['**/{*.,}gem*', 'script/'], {cwd: dest(), nocase: true});
  });

  /**
   * Run all "jekyll" tasks
   */

  app.task(taskName, tasks.concat([
    'styles',
    'root',
    'assets',
    'text',
    'overrides',
    'delete-ruby-files'
  ]));

  /**
   * Create a task for converting templates
   */

  function templates(taskname, folder, pattern, to, fn) {
    var dir = path.resolve(cwd, folder);
    tasks.push(taskname);

    app.task(taskname, function() {
      return vfs.src(pattern, {cwd: dir, allowEmpty: true, nocase: true})
        .pipe(stripEmptyMatter())
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

          file.extname = file.extname.replace(/liquid/, 'hbs');
          return dest(to || folder);
        }));
    });
  }

  function copy(taskname, folder, pattern) {
    tasks.push(taskname);
    app.task(taskname, function() {
      return vfs.src(pattern, { cwd: path.join(cwd, folder), allowEmpty: true })
        .pipe(stripEmptyMatter())
        .pipe(vfs.dest(function(file) {
          file.extname = file.extname.replace(/liquid/, 'hbs');
          return dest(folder);
        }));
    });
  }
};

function wrapFrame(file, props) {
  var str = file.contents.toString();
  if (str.slice(0, 3) !== '---') {
    var hash = props.map(function(prop) {
      return prop + '=' + prop;
    });
    str = `{{#frame ${hash.join(' ')}}}\n` + str.trim() + '\n{{/frame}}\n';
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

function addImport() {
  return through.obj(function(file, enc, next) {
    var str = file.contents.toString().trim();
    file.contents = new Buffer(str + '@import "custom";\n');
    next(null, file);
  });
}

function stripEmptyMatter() {
  return through.obj(function(file, enc, next) {
    if (typeof file.isBinary !== 'function') {
      file.isBinary = function() {
        return isBinary(file);
      };
    }

    if (isBinary(file) || file.isNull()) {
      next(null, file);
      return;
    }
    var str = file.contents.toString();
    if (str.slice(0, 8) === '---\n---\n') {
      file.contents = new Buffer(str.slice(8));
    }
    next(null, file);
  });
}
