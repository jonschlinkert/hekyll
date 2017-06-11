'use strict';

require('mocha');
var assert = require('assert');
var hekyll = require('..');

describe('hekyll', function() {
  it('should export a function', function() {
    assert.equal(typeof hekyll, 'function');
  });

  it('should throw an error when invalid args are passed', function() {
    assert.throws(function() {
      hekyll();
    });
  });
});
