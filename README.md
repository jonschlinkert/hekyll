# hekyll [![NPM version](https://img.shields.io/npm/v/hekyll.svg?style=flat)](https://www.npmjs.com/package/hekyll) [![NPM monthly downloads](https://img.shields.io/npm/dm/hekyll.svg?style=flat)](https://npmjs.org/package/hekyll) [![NPM total downloads](https://img.shields.io/npm/dt/hekyll.svg?style=flat)](https://npmjs.org/package/hekyll) [![Linux Build Status](https://img.shields.io/travis/jonschlinkert/hekyll.svg?style=flat&label=Travis)](https://travis-ci.org/jonschlinkert/hekyll)

> Migrate Jekyll (gh-pages) themes to use handlebars instead of liquid.

Follow this project's author, [Jon Schlinkert](https://github.com/jonschlinkert), for updates on this project and others.

## Install

Install with [npm](https://www.npmjs.com/):

```sh
$ npm install --save hekyll
```

## Usage

### Quickstart

The easiest way to use hekyll is to call the static `.build` method with an options object.

**Required options**

At minimum, you will need to define the following:

* `options.cwd` - the source directory with the jekyll theme to convert
* `options.destBase` - the base destination directory to write the converted or copied files to.

**Example**

```js
var Hekyll = require('hekyll');

Hekyll.build({cwd: 'jekyll_theme_folder', destBase: 'output_folder'})
  .then(function() {
    console.log('converted!');
  })
  .catch(console.error);
```

### Custom

The main export is a constructor function that takes an options object. Once an instance is created, you can use hekyll's methods to convert and copy files however you want. See [the API documentation](#api) for more details.

**Example**

```js
var Hekyll = require('hekyll');
var hekyll = new Hekyll({
  cwd: 'jekyll_theme_folder',
  destBase: 'output_folder'
});

function dest(dir) {
  return function(file) {
    return dir || '';
  };
}

hekyll.templates([
  `{,_*/**/}*.{html,markdown,mdown,mkdown,mkdn,mkd,md,textile,liquid}`,
  '!**/{README*,LICENSE*,CONTRIBUTING*}'
], dest())
  .then(hekyll.assets('{assets,public}/**', dest()))
  .then(hekyll.copy('_config.yml', dest()))
  .then(hekyll.copy('_data/**', dest('_data')))
  .then(hekyll.copy('_sass/**', dest('_sass')))
  .then(hekyll.copy('styles.scss', {addImport: 'custom'}, dest('_sass')))
  .then(hekyll.copy('**/*.{xml,txt}', function(file) {
    file.extname += '.hbs';
    return '';
  }))
  .then(hekyll.text(dest()))
  .then(function() {
    console.log('done!');
  })
  .catch(console.error)
```

**Required Options**

* `cwd`: the directory with source files for a Jekyll theme.
* `destBase`: the base destination directory for the converted theme.

## API

### [Hekyll](index.js#L20)

Create an instance of `Hekyll` with the given `options`.

**Params**

* `options` **{Object}**

**Example**

```js
var Hekyll = require('hekyll');
var hekyll = new Hekyll();
```

### [.templates](index.js#L42)

Copies and converts liquid templates to handlebars templates using the given glob `patterns`, `options` and `dest` function.

**Params**

* `patterns` **{String|Array}**
* `options` **{Object}**
* `dest` **{Function}**: Must return a string.
* `returns` **{Promise}**

**Example**

```js
hekyll.templates(patterns, {destBase: 'foo'}, function(file) {
  // optionally do stuff to vinyl "file" object
  // the returned folder is joined to `options.destBase`
  return 'folder_name';
});
```

### [.copy](index.js#L98)

Copies files using the given glob `patterns`, `options` and `dest` function. Converts liquid templates and strips front matter from files.

**Params**

* `patterns` **{String|Array}**
* `options` **{Object}**
* `dest` **{Function}**: Must return a string.
* `returns` **{Promise}**

**Example**

```js
hekyll.copy(patterns, {destBase: 'foo'}, function(file) {
  return '';
});
```

### [.assets](index.js#L134)

Copies assets files using the given glob `patterns`, `options` and `dest` function. Does not read the files or modify file contents in any way.

**Params**

* `patterns` **{String|Array}**
* `options` **{Object}**
* `dest` **{Function}**: Must return a string.
* `returns` **{Promise}**

**Example**

```js
hekyll.assets(patterns, {destBase: 'foo'}, function(file) {
  return '';
});
```

### [.text](index.js#L162)

Copies plain text files using the given glob `patterns`, `options` and `dest` function. Strips front-matter, but does not attempt to convert templates.

**Params**

* `patterns` **{String|Array}**
* `options` **{Object}**
* `dest` **{Function}**: Must return a string.
* `returns` **{Promise}**

**Example**

```js
hekyll.text(patterns, {destBase: 'foo'}, function(file) {
  return '';
});
```

## Choosing a theme

~20 jekyll themes were tested during the creation of this library, including all of the [poole/poole themes](https://github.com/poole/poole) from [@mdo](https://github.com/mdo), and all of the built-in [gh-pages themes](https://pages.github.com/themes/). Most themes convert flawlessly, but some have nuances that might require some manual editing.

**Handlebars helpers**

To be able to render the migrated templates with handlebars, you will first need to include any missing handlebars helpers that were converted from liquid filters and tags during the migration.

Here are some libraries that might be useful for this:

* [template-helpers](https://github.com/jonschlinkert/template-helpers) - generic helpers that can be used with any template engine.
* [handlebars-helpers](https://github.com/helpers/handlebars-helpers) - more than 150 handlebars helpers

**Bug reports**

If you find a bug or something that doesn't convert correctly, [please let me know](../../issues/new), I want this to work as seamlessly as possible.

## About

### Related projects

You might also be interested in these projects:

* [assemble](https://www.npmjs.com/package/assemble): Get the rocks out of your socks! Assemble makes you fast at creating web projects… [more](https://github.com/assemble/assemble) | [homepage](https://github.com/assemble/assemble "Get the rocks out of your socks! Assemble makes you fast at creating web projects. Assemble is used by thousands of projects for rapid prototyping, creating themes, scaffolds, boilerplates, e-books, UI components, API documentation, blogs, building websit")
* [gulp-liquid-to-handlebars](https://www.npmjs.com/package/gulp-liquid-to-handlebars): Convert liquid templates to handlebars templates. There are so many resources for jekyll and liquid… [more](https://github.com/jonschlinkert/gulp-liquid-to-handlebars) | [homepage](https://github.com/jonschlinkert/gulp-liquid-to-handlebars "Convert liquid templates to handlebars templates. There are so many resources for jekyll and liquid on github, but handlebars is a better engine for javascript. ")
* [liquid-to-handlebars](https://www.npmjs.com/package/liquid-to-handlebars): Convert liquid templates to handlebars templates. | [homepage](https://github.com/jonschlinkert/liquid-to-handlebars "Convert liquid templates to handlebars templates.")

### Contributing

Pull requests and stars are always welcome. For bugs and feature requests, [please create an issue](../../issues/new).

Please read the [contributing guide](.github/contributing.md) for advice on opening issues, pull requests, and coding standards.

### Building docs

_(This project's readme.md is generated by [verb](https://github.com/verbose/verb-generate-readme), please don't edit the readme directly. Any changes to the readme must be made in the [.verb.md](.verb.md) readme template.)_

To generate the readme, run the following command:

```sh
$ npm install -g verbose/verb#dev verb-generate-readme && verb
```

### Running tests

Running and reviewing unit tests is a great way to get familiarized with a library and its API. You can install dependencies and run tests with the following command:

```sh
$ npm install && npm test
```

### Author

**Jon Schlinkert**

* [github/jonschlinkert](https://github.com/jonschlinkert)
* [twitter/jonschlinkert](https://twitter.com/jonschlinkert)

### License

Copyright © 2017, [Jon Schlinkert](https://github.com/jonschlinkert).
Released under the [MIT License](LICENSE).

***

_This file was generated by [verb-generate-readme](https://github.com/verbose/verb-generate-readme), v0.6.0, on September 21, 2017._