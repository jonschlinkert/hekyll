'use strict';

var PluginError = require('plugin-error');
var isBinary = require('file-is-binary');
var through = require('through2');

exports.trim = function() {
  return plugin(function(file, next) {
    file.contents = new Buffer(file.contents.toString().trim() + '\n');
    next(null, file);
  });
};

exports.wrapFrame = function(props) {
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
};

exports.format = function() {
  return plugin(function(file, next) {
    var str = file.contents.toString();

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
    var str = file.contents.toString();
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
    var str = file.contents.toString().trim();
    file.contents = new Buffer(str + `\n@import "${options.addImport}";\n`);
    next(null, file);
  });
};

exports.stripEmptyMatter = function() {
  return plugin(function(file, next) {
    var str = file.contents.toString();
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
