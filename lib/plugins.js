'use strict';

const convert = require('liquid-to-handlebars');
const PluginError = require('plugin-error');
const isBinary = require('file-is-binary');
const through = require('through2');
const utils = require('./utils');

exports.trim = function() {
  return plugin(function(file, next) {
    file.contents = new Buffer(file.contents.toString().trim() + '\n');
    next(null, file);
  });
};

exports.convert = function(options) {
  var md = utils.MDEXTS.split(',').join('|');
  var re = new RegExp(`^\\.(${md}|html|liquid|scss|xml|txt)$`);
  return plugin(function(file, next) {
    if (!re.test(file.extname)) {
      next(null, file);
      return;
    }
    file.contents = new Buffer(convert(file.contents.toString(), options));
    next(null, file);
  });
};

exports.wrapFrame = function(props) {
  return plugin(function(file, next) {
    let str = file.contents.toString();
    if (!/{{/.test(str)) {
      next(null, file);
      return;
    }

    if (str.slice(0, 3) !== '---') {
      const hash = props.map(function(prop) {
        return prop + '=' + prop;
      });
      str = `{{#frame ${hash.join(' ')}}}\n` + str.trim() + '\n{{/frame}}\n';
      file.contents = new Buffer(str);
    }
    next(null, file);
  });
};

exports.format = function() {
  return plugin(function(file, next) {
    let str = file.contents.toString();

    // fix main `styles.css` path
    str = str.replace(/\/(?=styles\.css)/, '/assets/css/');

    // strip leading indentation before {{markdown}} tags
    str = str.replace(/^\s+(\{\{(\/|#)?(?:markdown|md))/gm, '$1');
    file.contents = new Buffer(str);
    next(null, file);
  });
};

exports.normalizeNewlines = function() {
  return plugin(function(file, next) {
    let str = file.contents.toString();
    file.contents = new Buffer(str.replace(/\r\n/g, '\n'));
    next(null, file);
  });
};

exports.addImport = function(options) {
  return plugin(function(file, next) {
    if (!options || typeof options.addImport !== 'string') {
      next(null, file);
      return;
    }
    let str = file.contents.toString().trim();
    file.contents = new Buffer(str + `\n@import "${options.addImport}";\n`);
    next(null, file);
  });
};

exports.stripEmptyMatter = function() {
  return plugin(function(file, next) {
    let str = file.contents.toString();
    if (str.slice(0, 8) === '---\n---\n') {
      file.contents = new Buffer(str.slice(8));
    }
    next(null, file);
  });
};

function plugin(fn) {
  return through.obj(function(file, enc, next) {
    try {
      if (isBinary(file) || file.isNull()) {
        next(null, file);
        return;
      }
      fn(file, next);
    } catch (err) {
      err.fn = fn;
      this.emit('error', new PluginError('hekyll', err, {showStack: true}));
      next(err);
    }
  });
}
