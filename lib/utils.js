'use strict';

const path = require('path');

exports.isPromise = function(val) {
  return val && typeof val.then === 'function';
};

exports.toDest = function(options) {
  return function(file) {
    file.extname = file.extname.replace(/liquid/, 'hbs');
    return path.resolve(options.destBase, options.dest(file));
  };
};

exports.toOptions = function(app, options, dest) {
  if (typeof options === 'function') {
    dest = options;
    options = null;
  }
  const defaults = {allowEmpty: true, dot: true, nocase: true, dest: dest};
  const opts = Object.assign({}, defaults, app.options, options);
  if (typeof opts.dest !== 'function') {
    return Promise.reject(new TypeError('expected options.dest to be a function'));
  }
  if (typeof opts.destBase !== 'string') {
    return Promise.reject(new TypeError('expected options.destBase to be a string'));
  }
  if (typeof opts.cwd !== 'string') {
    return Promise.reject(new TypeError('expected options.cwd to be a string'));
  }
  return opts;
};
