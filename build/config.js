'use strict';

var fs = require('fs');
var yaml = require('js-yaml');
var split = require('split-string');
var pick = require('object.pick');
var omit = require('object.omit');
var rightPad = require('right-pad-keys');

function convertConfig(config) {
  var obj = Object.assign({}, config);
  if (obj.permalink_path) {
    obj.permalinks = { structure: obj.permalink_path };
    delete obj.permalink_path;
  }

  if (obj.permalink) {
    obj.permalinks = { preset: obj.permalink };
    delete obj.permalink;
  }

  return obj;
}

module.exports = function parse(str, options) {
  var opts = Object.assign({}, options);
  let lines = split(str.trim(), '\n');
  let sections = {};
  var comments = {};
  var trailing = [];
  let stack = [];
  let keyStack = [];
  let prev;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (i === 0 && !/^#/.test(line)) {
      let key = '# temp';
      stack.push(key);
      sections[key] = [line];
    } else if (/^#/.test(line)) {
      var lineKey = line;
      while (/^#/.test(lines[i + 1])) {
        lineKey += '\n' + lines[++i];
      }
      stack.push(lineKey);
      sections[lineKey] = [];
    } else {
      if (line.trim() === '') {
        let prevKey = getKey(prev);
        trailing.push(prevKey);
      } else {
        var commentIdx = line.indexOf('#');
        if (commentIdx !== -1) {
          var comment = line.slice(commentIdx);
          if (comment.trim()) {
            let currentKey = getKey(line);
            comments[currentKey] = comment;
          }
        }
      }
      console.log(getIndent(line));

      let prop = stack[stack.length - 1];
      sections[prop].push(line);
    }
    prev = line;
  }

  let config = {data: {}, sections: {}, keys: []};
  for (let key in sections) {
    if (sections.hasOwnProperty(key)) {
      let val = yaml.safeLoad(sections[key].join('\n'));
      if (!val) continue;
      sections[key] = val;

      var sectionKeys = Object.keys(val);
      config.sections[key] = sectionKeys;
      config.keys = config.keys.concat(sectionKeys);
      Object.assign(config.data, val);
    }
  }

  var customConfig = omit(config.data, config.keys);
  if (Object.keys(customConfig).length !== 0) {
    config.sections['# Custom'] = customConfig;
  }

  var res = '';

  for (var k in config.sections) {
    if (k !== '# temp') {
      res += k;
      res += '\n';
    }

    if (config.sections.hasOwnProperty(k)) {
      var sect = pick(config.data, config.sections[k]);
      for (var p in sect) {
        if (sect.hasOwnProperty(p)) {
          var v = sect[p];
          if (/^(\\n|\\s)+$/.test(v) || v === '') {
            sect[p] = '"' + v + '"';
          }
        }
      }

      var sectYaml = yaml.dump(sect);
      if (opts.align === true) {
        sectYaml = alignSection(sectYaml);
      }

      res += sectYaml;
    }
  }

  var output = split(res, '\n').reduce(function(acc, line) {
    var extraLine = false;
    if (line.trim() !== '') {
      let key = line.slice(0, line.indexOf(':')).trim();
      if (trailing.indexOf(key) !== -1) {
        extraLine = true;
      }
      if (comments[key]) {
        line += ' ' + comments[key];
      }
    }
    acc.push(line);
    if (extraLine) acc.push('');
    return acc;
  }, []).join('\n');

  return output.replace(/\n{2,}/g, '\n\n');
}

function alignSection(str) {
  var lines = str.split('\n');
  var obj = {};
  for (var i = 0; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    toObject(lines[i], obj);
  }
  var aligned = rightPad(obj);
  var res = '';
  for (var key in aligned) {
    if (aligned.hasOwnProperty(key)) {
      res += key + aligned[key];
      res += '\n';
    }
  }
  return res;
}

function getIndent(line) {
  var m = /^[ \t]+/.exec(line);
  if (!m) return 0;
  return m[0].length;
}

function getKey(line) {
  var segs = split(line, ':');
  return segs.shift();
}

function toObject(line, obj) {
  var segs = split(line, ':');
  var key = segs.shift();
  var val = segs.join(':');
  obj[key + ':'] = val;
}
