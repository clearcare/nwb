'use strict';

exports.__esModule = true;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

exports.build = build;
exports.createBuildConfig = createBuildConfig;
exports.createServeConfig = createServeConfig;
exports.serve = serve;

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _runSeries = require('run-series');

var _runSeries2 = _interopRequireDefault(_runSeries);

var _webpackMerge = require('webpack-merge');

var _webpackMerge2 = _interopRequireDefault(_webpackMerge);

var _cleanApp = require('./commands/clean-app');

var _cleanApp2 = _interopRequireDefault(_cleanApp);

var _errors = require('./errors');

var _utils = require('./utils');

var _webpackBuild = require('./webpackBuild');

var _webpackBuild2 = _interopRequireDefault(_webpackBuild);

var _webpackServer = require('./webpackServer');

var _webpackServer2 = _interopRequireDefault(_webpackServer);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Create a quick build, installing any required dependencies first if
 * they're not resolvable.
 */
function build(args, appConfig, cb) {
  if (args._.length === 1) {
    return cb(new _errors.UserError('An entry module must be specified.'));
  }

  let dist = args._[2] || 'dist';

  (0, _runSeries2.default)([cb => (0, _utils.install)(appConfig.getQuickDependencies(), { args, check: true }, cb), cb => (0, _cleanApp2.default)({ _: ['clean-app', dist] }, cb), cb => (0, _webpackBuild2.default)(`${appConfig.getName()} app`, args, () => createBuildConfig(args, appConfig.getQuickBuildConfig()), cb)], cb);
}

/**
 * Create default command config for a quick app build and merge any extra
 * config provided into it.
 */
function createBuildConfig(args, options) {
  let {
    commandConfig: extraConfig = {},
    defaultTitle,
    renderShim,
    renderShimAliases
  } = options;

  let entry = _path2.default.resolve(args._[1]);
  let dist = _path2.default.resolve(args._[2] || 'dist');
  let mountId = args['mount-id'] || 'app';

  let production = process.env.NODE_ENV === 'production';
  let filenamePattern = production ? '[name].[chunkhash:8].js' : '[name].js';

  let config = {
    babel: {
      stage: 0
    },
    devtool: 'source-map',
    output: {
      chunkFilename: filenamePattern,
      filename: filenamePattern,
      path: dist,
      publicPath: '/'
    },
    plugins: {
      html: {
        mountId,
        title: args.title || defaultTitle
      },
      // A vendor bundle can be explicitly enabled with a --vendor flag
      vendor: args.vendor
    }
  };

  if (renderShim == null || args.force === true) {
    config.entry = { app: [entry] };
  } else {
    // Use a render shim module which supports quick prototyping
    config.entry = { app: [renderShim] };
    config.plugins.define = { NWB_QUICK_MOUNT_ID: JSON.stringify(mountId) };
    config.resolve = {
      alias: _extends({
        // Allow the render shim module to import the provided entry module
        'nwb-quick-entry': entry
      }, renderShimAliases)
    };
  }

  if (args.polyfill === false || args.polyfills === false) {
    config.polyfill = false;
  }

  return (0, _webpackMerge2.default)(config, extraConfig);
}

/**
 * Create default command config for quick serving and merge any extra config
 * provided into it.
 */
function createServeConfig(args, options) {
  let {
    commandConfig: extraConfig = {},
    defaultTitle,
    renderShim,
    renderShimAliases
  } = options;

  let entry = _path2.default.resolve(args._[1]);
  let dist = _path2.default.resolve(args._[2] || 'dist');
  let mountId = args['mount-id'] || 'app';

  let config = {
    babel: {
      stage: 0
    },
    output: {
      filename: 'app.js',
      path: dist,
      publicPath: '/'
    },
    plugins: {
      html: {
        mountId,
        title: args.title || defaultTitle
      }
    }
  };

  if (args.force === true || renderShim == null) {
    config.entry = [entry];
  } else {
    config.entry = [renderShim];
    config.plugins.define = { NWB_QUICK_MOUNT_ID: JSON.stringify(mountId) };
    config.resolve = {
      alias: _extends({
        // Allow the render shim module to import the provided entry module
        'nwb-quick-entry': entry
      }, renderShimAliases)
    };
  }

  if (args.polyfill === false || args.polyfills === false) {
    config.polyfill = false;
  }

  return (0, _webpackMerge2.default)(config, extraConfig);
}

/**
 * Run a quick development server, installing any required dependencies first if
 * they're not resolvable.
 */
function serve(args, appConfig, cb) {
  if (args._.length === 1) {
    return cb(new _errors.UserError('An entry module must be specified.'));
  }

  (0, _runSeries2.default)([cb => (0, _utils.install)(appConfig.getQuickDependencies(), { args, check: true }, cb), cb => (0, _webpackServer2.default)(args, createServeConfig(args, appConfig.getQuickServeConfig()), cb)], cb);
}