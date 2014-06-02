/*
 * Dependancies
 */

// core modules
var path = require('path');
var koa = require('koa');
// var etag = require('koa-etag');
// var fresh = require('koa-fresh');
// var serve = require('koa-static');
// var views = require('koa-views');
// var favicon = require('koa-favicon');
// var router = require('koa-router');
// var compress = require('koa-compress');
// var respTime = require('koa-response-time');

// local deps
var bundler = require('./lib/app-bundler');

// create koa app (exported)
var app = module.exports = koa();
app.name = 'Koa based SPA app.';

var publicDir = path.join(__dirname, 'public');
var privateDir = path.join(__dirname, 'private');
var productionMode = (app.env == 'production');

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
