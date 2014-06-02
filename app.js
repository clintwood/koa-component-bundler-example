/*
 * Dependancies
 */

// core modules
var path = require('path');
var koa = require('koa');

// local deps
var bundler = require('./lib/app-bundler');

// create koa app (exported)
var app = module.exports = koa();
app.name = 'Koa based SPA app.';

var publicDir = path.join(__dirname, 'public');
var privateDir = path.join(__dirname, 'private');

// middlewares

// global error handling
app.use(function* errors(next) {
  try {
    yield* next;
  } catch (err) {
    this.status = err.status || 500;
    this.body = err.message;
    this.app.emit('error', err, this);
  }
});

app.use(bundler({
  root: path.join(privateDir, 'app'),
  build: publicDir
}))
