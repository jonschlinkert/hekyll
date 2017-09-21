var path = require('path');
var Hekyll = require('..');
var hekyll = new Hekyll({
  cwd: path.join(__dirname, '../vendor/poole'),
  destBase: 'temp/src'
});

var patterns = [
  '{,_*/**/}*.{html,markdown,mdown,mkdown,mkdn,mkd,md,textile,liquid}',
  '!**/{README*,LICENSE*,CONTRIBUTING*}'
];

function dest(dir) {
  return function(file) {
    return dir || '';
  };
}

hekyll.templates(patterns, dest())
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
  .catch(console.error);
