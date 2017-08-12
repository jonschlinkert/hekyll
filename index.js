'use strict';

var path = require('path');
var Assemble = require('assemble-core');
var isBinary = require('file-is-binary');
var PluginError = require('plugin-error');
var convert = require('gulp-liquid-to-handlebars');
var through = require('through2');
var vfs = require('vinyl-fs');
var del = require('delete');

module.exports = function(options) {
  var opts = Object.assign({}, options);

  if (typeof opts.src !== 'string') {
    return Promise.reject(new TypeError('expected options.src to be a string'));
  }
  if (typeof opts.dest !== 'string') {
    return Promise.reject(new TypeError('expected options.dest to be a string'));
  }

  /**
   * Build variables
   */

  var app = new Assemble(opts);
  var mdexts = 'markdown,mkdown,mkdn,mkd,md';
  var src = path.resolve.bind(path, opts.src);
  var dest = path.resolve.bind(path, opts.dest);
  var overrides = src('overrides');
  var cwd = src();
  var tasks = [];

  /**
   * Convert liquid to handlebars
   */

  app.task('templates', function() {
    var patterns = [
      `{,_*/**/}*.{html,${mdexts},textile,liquid}`,
      '!**/{README*,LICENSE*,CONTRIBUTING*}'
    ];

    return vfs.src(patterns, {cwd: cwd, allowEmpty: true, dot: true})
      .pipe(normalizeNewlines())
      .pipe(stripEmptyMatter())
      .pipe(convert({prefix: '@'}))
      .pipe(format())
      .pipe(wrapFrame(['page', 'site']))
      .pipe(vfs.dest(function(file) {
        switch (file.extname) {
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
        return dest();
      }));
  });

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
    return vfs.src('styles.scss', {cwd: cwd, allowEmpty: true, dot: true })
      .pipe(stripEmptyMatter())
      .pipe(convert({yfm: false, prefix: '@'}))
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
    return vfs.src('**/*.{xml,txt}', {cwd: cwd, allowEmpty: true, dot: true })
      .pipe(stripEmptyMatter())
      .pipe(convert({prefix: '@'}))
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
    return vfs.src('{assets,public}/**', {cwd: cwd, allowEmpty: true, dot: true })
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

  app.task('hekyll', tasks.concat([
    'templates',
    'styles',
    'root',
    'assets',
    'text',
    'overrides',
    'delete-ruby-files'
  ]));

  /**
   * Create tasks for copying files
   */

  function copy(name, folder, pattern) {
    var dir = path.join(cwd, folder);
    var key = 'copy-' + name;
    tasks.push(key);
    app.task(key, function() {
      return vfs.src(pattern, { cwd: dir, allowEmpty: true, dot: true })
        .pipe(stripEmptyMatter())
        .pipe(vfs.dest(function(file) {
          file.extname = file.extname.replace(/liquid/, 'hbs');
          return dest(folder);
        }));
    });
  }

  return new Promise(function(resolve, reject) {
    app.build('hekyll', function(err) {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

function wrapFrame(props) {
  return plugin(function(file, next) {
    var str = file.contents.toString();
    if (str.slice(0, 3) !== '---') {
      var hash = props.map(function(prop) {
        return prop + '=' + prop;
      });
      str = `{{#frame ${hash.join(' ')}}}\n` + str.trim() + '\n{{/frame}}\n';
      file.contents = new Buffer(str);
    }
    next(null, file);
  });
}

function format() {
  return plugin(function(file, next) {
    var str = file.contents.toString();

    // fix main `styles.css` path
    str = str.replace(/\/(?=styles\.css)/, '/assets/css/');

    // strip leading indentation before {{markdown}} tags
    str = str.replace(/^\s+(\{\{(\/|#)?(?:markdown|md))/gm, '$1');
    file.contents = new Buffer(str);
    next(null, file);
  });
}

function normalizeNewlines() {
  return plugin(function(file, next) {
    var str = file.contents.toString();
    str = str.replace(/\r\n/g, '\n');
    file.contents = new Buffer(str);
    next(null, file);
  });
}

function addImport() {
  return plugin(function(file, next) {
    var str = file.contents.toString().trim();
    file.contents = new Buffer(str + '@import "custom";\n');
    next(null, file);
  });
}

function stripEmptyMatter() {
  return plugin(function(file, next) {
    var str = file.contents.toString();
    if (str.slice(0, 8) === '---\n---\n') {
      file.contents = new Buffer(str.slice(8));
    }
    next(null, file);
  });
}

function plugin(fn) {
  return through.obj(function(file, enc, next) {
    try {
      if (isBinary(file) || file.isNull()) {
        next(null, file);
        return;
      }
      fn(file, next);
    } catch (err) {
      this.emit('error', new PluginError('hekyll', err, {showStack: true}));
      next(err);
    }
  });
}
