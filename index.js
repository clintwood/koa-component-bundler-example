
/*
 * Dependancies
 */

var app = module.exports = require('./app');

// add routes
//require('./routes')(app);

// spin up app
if (!module.parent) {
  var port = process.env.PORT || 3000;
  app.listen(port, function(err) {
    if (err) throw err;
    console.log('%s listening on port %s.', (app.name || 'WebSite'), port);
  });
}
