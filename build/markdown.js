'use strict';

var Remarkable = require('remarkable');
var unescape = require('unescape');
var defaults = require('./defaults');
var assign = Object.assign;
var delimiterRegex = /(?:\{{2,4})([^{}]+?)(?:\}{2,4})/g;

module.exports = function(app, view, locals) {
  Object.defineProperty(view, 'html', {
    configurable: true,
    enumerable: true,
    set: function(val) {
      this._html = val;
    },
    get: function() {
      if (this._html) {
        return this._html;
      }

      this.markdown = this.contents;
      var opts = assign({}, app.options, defaults, locals);
      var ctx = assign({}, app.cache.data, locals, this.data);
      var md = new Remarkable(opts);
      var engine = app.getEngine(opts.engine || 'hbs');
      var fn = engine.compile(this.contents.toString());
      var str = fn(ctx);
      var html = md.render(str);
      this._html = html.replace(delimiterRegex, function(m, inner) {
        return unescape(inner);
      });
      return this._html;
    }
  });
};
