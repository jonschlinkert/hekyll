var path = require('path');
var Hekyll = require('./');

Hekyll.build({cwd: path.join(__dirname, '../vendor/poole'), destBase: 'temp/src'})
  .then(function() {
    console.log('done!');
  })
  .catch(console.error);
