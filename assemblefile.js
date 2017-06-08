'use strict';

var path = require('path');
var yaml = require('js-yaml');
var del = require('delete');
var sass = require('gulp-sass');
var assemble = require('assemble');
var cheerio = require('cheerio');
var pageData = require('assemble-middleware-page-variable');
var pipeline = require('./build/pipeline');
var markdown = require('./build/markdown');
var helpers = require('./build/helpers');
var hekyll = require('./');
var app = module.exports = assemble();

/**
 * Build variables
 */

var cwd = path.resolve.bind(path, __dirname);
var theme = app.options.theme || 'poole';
var dir = app.options.dest || 'src';
var src = path.resolve.bind(path, cwd(dir));
var dest = path.resolve.bind(path, cwd('dist'));

/**
 * Plugins
 */

app.use(helpers);
app.use(hekyll('hekyll', cwd(`vendor/${theme}`), src()));

/**
 * Middleware
 */

app.onLoad(/\.md$/, function(file, next) {
  markdown(app, file, {});
  next();
});

app.onLoad(/\.(hbs|html|md)$/, function(file, next) {
  file.extname = '.html';
  next();
});

app.preWrite(/\.html$/, function(file, next) {
  var $ = cheerio.load(file.content);
  $('a').each(function(i, ele) {
    var href = ele.attribs.href;
    switch (href) {
      case '../':
        href = '../index.html';
        break;
      case '.':
      case './':
        href = 'index.html';
        break;
    }
    if (/^\./.test(href) && !path.extname(href)) {
      href += '.html';
    }
    ele.attribs.href = href;
  });
  file.content = $.html();
  next();
});

/**
 * Data
 */

app.dataLoader('yml', function(buf, file) {
  var data = yaml.safeLoad(buf);
  var name = path.basename(file);
  if (name === '_config.yml') {
    data.baseurl = data.baseurl || '.';
  }
  return data;
});

app.dataLoader('csv', function(buf) {
  throw new Error('CSV data is not supported by hekyll');
});

app.data(src('*_config.yml'), {namespace: 'site'});
app.data(src('_data/*'), {namespace: 'site'});
app.data('site.dest', dest());

app.task('templates', function(cb) {
  app.create('posts');

  app.partials(src('_includes/*'));
  app.layouts(src('_layouts/*'));
  app.posts(src('_posts/*'));
  app.pages(src('_pages/*'));

  var posts = app.views.posts;
  var list = new app.List();
  list.addItems(posts);

  console.log(list.paginate({limit: 1}))

  app.data('paginator.posts', list.items);
  app.data('site.posts', posts);
  cb();
});

/**
 * Tasks
 */

app.task('pages', function() {
  return app.toStream('pages')
    .pipe(pipeline.markdown(app))
    .pipe(app.renderFile())
    .pipe(app.dest(dest()));
});

app.task('posts', function() {
  return app.toStream('posts')
    .pipe(pipeline.markdown(app))
    .pipe(app.renderFile())
    .pipe(app.dest(dest('posts')));
});

app.task('root', function() {
  return app.src(src('*.*.hbs'))
    .pipe(app.renderFile('hbs'))
    .pipe(app.dest(function(file) {
      file.extname = file.extname.slice(0, -file.extname.length);
      return dest();
    }));
});

app.task('sass', function() {
  return app.src(['_sass/*.scss'], {cwd: src()})
    .pipe(sass({outputStyle: 'expanded'}).on('error', sass.logError))
    .pipe(app.dest(dest('assets/css')));
});

app.task('assets', function() {
  return app.copy(src('public/**'), dest('public'));
});

app.task('delete', function() {
  return del(dest());
});

app.task('default', [
  'delete',
  'templates',
  'pages',
  'posts',
  'root',
  'sass',
  'assets'
]);
