/**
 * Dependencies
 */

var fs = require('fs');
var cofs = require('co-fs');
var path = require('path');
var mkdirp = require('mkdirp');
var resolver = require('component-resolver');
var bundler = require('component-bundler');
var builder = require('component-builder');

module.exports = function (options) {
  if ('string' == typeof options) {
    options = {
      root: options
    };
  }
  if (!options.root)
    throw new Error('Options: src is required.');

  // validate that root (component) folder has component.json in it...
  var comp = path.join(options.root, 'component.json');
  if (!fs.existsSync(comp))
    throw new Error('Root component.json not found at: ' + options.root);

  // default dst if it doesn't exist
  if (!options.build) {
    options.build = path.join(options.root, 'build');
  }
  // ensure destination folders exist
  mkdirp.sync(path.join(options.build, 'scripts'));
  mkdirp.sync(path.join(options.build, 'css'));

  // koa middelware
  return function* appBundler(next) {
    // filter on HTTP GET/HEAD & *.js|css resource targeting build dir
    if (('GET' !== this.method && 'HEAD' !== this.method) || !/\.(js|css)$/.test(this.path) ||
      path.relative(options.build, this.path).slice(0, 2) != '..')
      return yield* next;

    // do some caching here

    // process bundles
    var json = JSON.parse((yield cofs.readFile(comp)));
    var pageBundler = bundler.pages(json);

    var tree = yield* resolver(options.root, {
      install: true
    });

    // create bundles
    var bundles = pageBundler(tree);

    // build each bundle
    var builds = Object.keys(bundles).map(function (name) {
      return function* bundleBuilder() {
        // build js
        var file;
        var js = yield builder.scripts(bundles[name])
          .use('scripts', builder.plugins.js())
          .end();
        
        // add require implementation to main bundle
        if (name === json.locals[0])
          js = builder.scripts.require + js;

        // write or remove target file
        file = path.join(options.build, 'scripts', name + '.js');
        if (!js) {
          if (fs.existsSync(file)) fs.unlinkSync(file)
        } else {
          yield cofs.writeFile(file, js, 'utf8');
        }

        // build css
        var css = yield builder.styles(bundles[name])
          .use('styles', builder.plugins.css())
          .end();
        // write or remove target file
        file = path.join(options.build, 'css', name + '.css');
        if (!css) {
          if (fs.existsSync(file)) fs.unlinkSync(file)
        } else {
          yield cofs.writeFile(file, css, 'utf8');
        }
      }
    });

    // actually do the builds
    yield builds;

    // check and return requested file
    var target;
    switch (path.extname(this.path)) {
    case '.js':
      {
        target = path.join(options.build, this.path);
        if (yield cofs.exists(target)) {
          this.status = 200;
          this.body = yield cofs.readFile(target, 'utf8');
          this.set('Content-Type', 'application/javascript');
        }
      }
      break;

    case '.css':
      {
        target = path.join(options.build, this.path);
        if (yield cofs.exists(target)) {
          this.status = 200;
          this.body = yield cofs.readFile(target, 'utf8');
          this.set('Content-Type', 'text/css');
        }
      }
      break;
    }

    yield* next;
  }
}