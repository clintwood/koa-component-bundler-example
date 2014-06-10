/**
 * Dependencies
 */

var fs = require('fs');
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
  return function appBundler(req, res, next) {
    // filter on HTTP GET/HEAD & *.js|css resource targeting build dir
    if (('GET' !== req.method && 'HEAD' !== req.method) || !/\.(js|css)$/.test(req.path) ||
      path.relative(options.build, req.path).slice(0, 2) != '..') {
      next();
      return;
    }

    // do some caching here

    // process bundles
    var json = JSON.parse(fs.readFileSync(comp));
    var pageBundler = bundler.pages(json);

    resolver(options.root, {
        install: true
      },
      bundle);

    function bundle(err, tree) {
      // create bundles
      var bundles = pageBundler(tree);

      // build each bundle
      var builds = Object.keys(bundles).map(function (name) {
        return function bundleBuilder() {
          // build js
          var file;
          builder.scripts(bundles[name])
            .use('scripts', builder.plugins.js())
            .end(function (err, js) {

              // add require implementation to main bundle
              if (name === json.locals[0])
                js = builder.scripts.require + js;

              // write or remove target file
              file = path.join(options.build, 'scripts', name + '.js');
              if (!js) {
                if (fs.existsSync(file)) fs.unlinkSync(file)
              } else {
                fs.writeFileSync(file, js, 'utf8');
              }
            });

          // build css
          builder.styles(bundles[name])
            .use('styles', builder.plugins.css())
            .end(function (err, css) {
              // write or remove target file
              file = path.join(options.build, 'css', name + '.css');
              if (!css) {
                if (fs.existsSync(file)) fs.unlinkSync(file)
              } else {
                fs.writeFileSync(file, css, 'utf8');
              }
            });
        };
      });

      // actually do the builds
      builds.forEach(function (bundleBuilder) {
        bundleBuilder();
      });

      // check and return requested file
      var target;
      switch (path.extname(req.path)) {
      case '.js':
        {
          target = path.join(options.build, req.path);
          if (fs.existsSync(target)) {
            res.set('Content-Type', 'application/javascript');
            res.send(fs.readFileSync(target, 'utf8'));
          }
        }
        break;

      case '.css':
        {
          target = path.join(options.build, req.path);
          if (fs.existsSync(target)) {
            res.set('Content-Type', 'text/css');
            res.send(fs.readFileSync(target, 'utf8'));
          }
        }
        break;
      }

      //next();
    }
  }
}