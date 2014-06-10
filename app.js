/*
 * Dependancies
 */

// core modules
var path = require('path');
var express = require('express');

// local deps
var bundler = require('./lib/app-bundler');

// create koa app (exported)
var app = module.exports = express();

var publicDir = path.join(__dirname, 'public');
var privateDir = path.join(__dirname, 'private');

// middlewares

app.use(bundler({
  root: path.join(privateDir, 'app'),
  build: publicDir
}))

app.use(function(err, req, res, next){
  console.error(err.stack);
  res.send(500, 'Something broke!');
});
