'use strict';

const path = require('path');
const vfs = require('vinyl-fs');
const through = require('through2');
const plugin = require('./lib/plugins');
const utils = require('./lib/utils');

/**
 * Create an instance of `Hekyll` with the given `options`.
 *
 * ```js
 * var Hekyll = require('hekyll');
 * var hekyll = new Hekyll();
 * ```
 * @param {Object} `options`
 * @api public
 */

function Hekyll(options) {
  this.options = Object.assign({}, options);
}

/**
 * Copies and converts liquid templates to handlebars templates
 * using the given glob `patterns`, `options` and `dest` function.
 *
 * ```js
 * hekyll.templates(patterns, {destBase: 'foo'}, function(file) {
 *   // optionally do stuff to vinyl "file" object
 *   // the returned folder is joined to `options.destBase`
 *   return 'folder_name';
 * });
 * ```
 * @param {String|Array} `patterns`
 * @param {Object} `options`
 * @param {Function} `dest` Must return a string.
 * @return {Promise}
 * @api public
 */

Hekyll.prototype.templates = function(patterns, options, dest) {
  const opts = utils.toOptions(this, options, dest);
  if (utils.isPromise(opts)) return opts;

  return new Promise(function(resolve, reject) {
    vfs.src(patterns, opts)
      .pipe(plugin.normalizeNewlines())
      .on('error', reject)
      .pipe(plugin.stripEmptyMatter())
      .on('error', reject)
      .pipe(plugin.convert({prefix: '@'}))
      .on('error', reject)
      .pipe(plugin.format())
      .on('error', reject)
      .pipe(plugin.wrapFrame(['page', 'site']))
      .on('error', reject)
      .pipe(vfs.dest(function(file) {
        switch (file.extname) {
          case '.html':
          case '.liquid':
            file.extname = '.hbs';
            break;
          case '.markdown':
          case '.mkdown':
          case '.mkdn':
          case '.mkd':
          case '.mdown':
          case '.md':
            file.extname = '.md';
            break;
          case '.yaml':
            file.extname = '.yml';
            break;
        }
        return utils.toDest(opts)(file);
      }))
      .on('error', reject)
      .on('end', resolve);
  });
};

/**
 * Copies files using the given glob `patterns`, `options` and `dest`
 * function. Converts liquid templates and strips front matter from files.
 *
 * ```js
 * hekyll.copy(patterns, {destBase: 'foo'}, function(file) {
 *   return '';
 * });
 * ```
 * @param {String|Array} `patterns`
 * @param {Object} `options`
 * @param {Function} `dest` Must return a string.
 * @return {Promise}
 * @api public
 */

Hekyll.prototype.copy = function(patterns, options, dest) {
  const opts = utils.toOptions(this, options, dest);
  if (utils.isPromise(opts)) return opts;

  return new Promise(function(resolve, reject) {
    vfs.src(patterns, opts)
      .pipe(plugin.stripEmptyMatter())
      .on('error', reject)
      .pipe(plugin.convert({yfm: false, prefix: '@'}))
      .on('error', reject)
      .pipe(plugin.wrapFrame(['page', 'site']))
      .pipe(plugin.addImport(opts))
      .on('error', reject)
      .pipe(plugin.trim())
      .on('error', reject)
      .pipe(vfs.dest(utils.toDest(opts)))
      .on('error', reject)
      .on('end', resolve);
  });
};

/**
 * Copies assets files using the given glob `patterns`, `options` and `dest`
 * function. Does not read the files or modify file contents in any way.
 *
 * ```js
 * hekyll.assets(patterns, {destBase: 'foo'}, function(file) {
 *   return '';
 * });
 * ```
 * @param {String|Array} `patterns`
 * @param {Object} `options`
 * @param {Function} `dest` Must return a string.
 * @return {Promise}
 * @api public
 */

Hekyll.prototype.assets = function(patterns, options, dest) {
  const opts = utils.toOptions(this, options, dest);
  if (utils.isPromise(opts)) return opts;

  return new Promise(function(resolve, reject) {
    vfs.src(patterns, opts)
      .pipe(vfs.dest(utils.toDest(opts)))
      .on('error', reject)
      .on('end', resolve);
  });
};

/**
 * Copies plain text files using the given glob `patterns`, `options` and `dest`
 * function. Strips front-matter, but does not attempt to convert templates.
 *
 * ```js
 * hekyll.text(patterns, {destBase: 'foo'}, function(file) {
 *   return '';
 * });
 * ```
 * @param {String|Array} `patterns`
 * @param {Object} `options`
 * @param {Function} `dest` Must return a string.
 * @return {Promise}
 * @api public
 */

Hekyll.prototype.text = function(options, dest) {
  const opts = utils.toOptions(this, options, dest);
  if (utils.isPromise(opts)) return opts;

  const patterns = opts.patterns || [
    '**/*',
    `!**/{_*,assets,public,*.{html,liquid,${utils.MDEXTS},scss,txt,xml}}`,
    '!**/{*.,}gem*',
    '!**/script{,/**}',
    '!**/.git{,/**}'
  ];

  return new Promise(function(resolve, reject) {
    vfs.src(patterns, opts)
      .pipe(plugin.stripEmptyMatter())
      .on('error', reject)
      .pipe(plugin.convert({prefix: '@'}))
      .on('error', reject)
      .pipe(vfs.dest(utils.toDest(opts)))
      .on('error', reject)
      .on('end', resolve);
  });
};

Hekyll.build = function(options) {
  if (!options) {
    return Promise.reject('expected options to be an object');
  }

  const hekyll = new Hekyll(options);
  const patterns = hekyll.options.patterns || [
    `{,_*/**/}*.{html,liquid,${utils.MDEXTS},textile}`
  ];

  function dest(dir) {
    return function(file) {
      return dir || '';
    };
  }

  return hekyll.templates(patterns, dest())
    .then(hekyll.assets('{assets,public}/**', dest()))
    .then(hekyll.copy('**/*.{xml,txt}', dest()))
    .then(hekyll.copy('_config.yml', dest()))
    .then(hekyll.copy('_data/**', dest('_data')))
    .then(hekyll.copy('_sass/**', dest('_sass')))
    .then(hekyll.copy('styles.scss', {addImport: 'custom'}, dest('_sass')))
    .then(hekyll.copy(path.join(__dirname, 'custom.scss'), dest('_sass')))
    .then(hekyll.text(dest()));
};

/**
 * Expose `Hekyll`
 */

module.exports = Hekyll;
