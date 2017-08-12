var hekyll = require('./');

hekyll({src: 'vendor/poole', dest: 'temp/src'})
  .then(function() {
    console.log('done');
  })
  .catch(console.error)

