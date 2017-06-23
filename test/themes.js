'use strict';

require('mocha');
var assert = require('assert');
var hekyll = require('..');

describe('themes', function() {
  it('should export a function', function() {
    assert.equal(typeof hekyll, 'function');
  });
});
