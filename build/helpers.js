'use strict';

var path = require('path');
var ent = require('ent');
var isValid = require('is-valid-app');
var moment = require('moment-strftime');
var utils = require('handlebars-utils');
var helpers = require('handlebars-helpers')();
var Remarkable = require('remarkable');
var defaults = require('./defaults');
var unescape = require('unescape');
var assign = Object.assign;

module.exports = function(app) {
  if (!isValid(app, 'hekyll-helpers')) return;
  app.helpers(require('liquid-to-handlebars/lib/helpers'));
  app.helpers(helpers);
  app.use(require('assemble-helpers')());
  app.asyncHelper('md', helpers.md);

  app.helper('helperMissing', function() {
    var opts = [].slice.call(arguments).pop();
    console.log(`missing helper {{${opts.name}}}`);
  });

  app.helper('date', function(date, format) {
    if (date === 'now') {
      date = Date.now();
    }
    if (typeof date === 'string') {
      date = new Date(date);
    }
    return moment(date).strftime(format);
  });

  app.helper('date_to_xmlschema', function(date) {
    return moment(date).toISOString();
  });

  app.helper('date_to_string', function(date) {
    return moment(date).format('DD MMM YYYY');
  });

  // XML escape a string for use. Replaces any special characters
  // with appropriate HTML entity replacements.
  app.helper('xml_escape', function(str) {
    return typeof str === 'string' ? ent.encode(str) : '';
  });

  app.helper('log', function() {
    var args = [].slice.call(arguments);
    args.pop();
    console.log.apply(console, args);
  });

  app.helper('empty', function() {
    return this.app.getHelper('isEmpty').apply(this, arguments);
  });

  app.helper('limit', function fn(list, limit, options) {
    if (!list || !Array.isArray(list)) {
      return [];
    }

    list._i = list._i || 0;
    var len = list.length - 1;
    var n = list._i++ % len;
    var items = list.slice(n, n + limit);
    if (items.length < limit) {
      items.push.apply(items, list.slice(0, limit - items.length));
    }
    return items;
  });

  app.helper('excerpt', function(str, options) {
    return str.slice(0, 150);
  });

  // app.asyncHelper('markdown', function(str, options, cb) {
  //   if (typeof options === 'function') {
  //     cb = options;
  //     options = {};
  //   }

  //   if (utils.isOptions(str)) {
  //     options = str;
  //     str = null;
  //   }

  //   var opts = assign({}, defaults, this.options.remarkable, options.hash);
  //   var md = new Remarkable(opts);

  //   var input = typeof str === 'string' ? str : opts.fn(this);
  //   var view = this.app.view('temp.hbs', {content: str});

  //   this.app.render(view, this.context, function(err, view) {
  //     if (err) {
  //       cb(err);
  //       return;
  //     }

  //     view.content = md.render(view.content);
  //     view.content = view.content.replace(/(\{{2,4})([^{}]+?)(\}{2,4})/g, function(m, open, inner, close) {
  //       return open + unescape(inner) + close;
  //     });
  //     cb(null, view.contents.toString());
  //   });
  // });
};

