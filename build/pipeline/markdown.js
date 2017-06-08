'use strict';

var path = require('path');
var PluginError = require('plugin-error');
var Remarkable = require('remarkable');
var unescape = require('unescape');
var through = require('through2');
var defaults = require('../defaults');
var assign = Object.assign;

/**
 * convert markdown to HTML
 */

module.exports = function(app, options) {
  var opts = assign({}, defaults, options);
  var engine = app.getEngine(app.options.engine || 'hbs');

  return through.obj(function(file, enc, next) {
    if (file.isNull()) {
      next(null, file);
      return;
    }

    if (path.extname(file.history[0]) !== '.md') {
      next(null, file);
      return;
    }

    var ctx = Object.assign({}, app.cache.data, file.data);
    var fn = engine.compile(file.contents.toString());
    var str = fn(ctx);

    try {
      var md = new Remarkable(opts);
      str = md.render(str);
      str = str.replace(/(\{{2,4})([^{}]+?)(\}{2,4})/g, function(m, open, inner, close) {
        return open + unescape(inner) + close;
      });
      file.contents = new Buffer(str);
      file.extname = '.html';
    } catch (err) {
      this.emit('error', new PluginError('remarkable', err, {fileName: file.path}));
      return;
    }
    next(null, file);
  });
};
