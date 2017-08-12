'use strict';

require('mocha');
var fs = require('fs');
var path = require('path');
var del = require('delete');
var assert = require('assert');
var hekyll = require('..');

var fixtures = path.resolve.bind(path, __dirname, 'fixtures');
var actual = path.resolve.bind(path, __dirname, 'actual');

describe('hekyll', function() {
  it('should export a function', function() {
    assert.equal(typeof hekyll, 'function');
  });

  it('should throw an error when invalid args are passed', function(cb) {
    hekyll()
      .catch(function(err) {
        assert(err);
        cb();
      });
  });

  it('should convert a theme to handlebars', function() {
    return hekyll({src: fixtures(), dest: actual()})
      .then(function() {
        assert(fs.existsSync(actual()))
        assert(fs.existsSync(actual('atom.xml.hbs')))
        assert(fs.existsSync(actual('_config.yml')))
        assert(fs.existsSync(actual('_layouts/default.hbs')))
        del.sync(actual());
      })
  });
});
