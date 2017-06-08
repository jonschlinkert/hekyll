'use strict';

var path = require('path');
var PluginError = require('plugin-error');
var through = require('through2');
var cheerio = require('cheerio');
var assign = Object.assign;

/**
 * convert markdown to HTML
 */

module.exports = function(app, options) {
  var opts = assign({}, options);

  return through.obj(function(file, enc, next) {
    if (file.isNull()) {
      next(null, file);
      return;
    }

    var $ = cheerio.load(file.contents.toString());
    $('a').each(function(i, ele) {
      console.log(ele.attribs);
    });

    try {
    } catch (err) {
      this.emit('error', new PluginError('cheerio', err, {fileName: file.path}));
      return;
    }
    next(null, file);
  });
};
