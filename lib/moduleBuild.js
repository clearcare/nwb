'use strict';

exports.__esModule = true;
exports.default = moduleBuild;

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _crossSpawn = require('cross-spawn');

var _crossSpawn2 = _interopRequireDefault(_crossSpawn);

var _ora = require('ora');

var _ora2 = _interopRequireDefault(_ora);

var _runSeries = require('run-series');

var _runSeries2 = _interopRequireDefault(_runSeries);

var _webpackMerge = require('webpack-merge');

var _webpackMerge2 = _interopRequireDefault(_webpackMerge);

var _cleanModule = require('./commands/clean-module');

var _cleanModule2 = _interopRequireDefault(_cleanModule);

var _config = require('./config');

var _createBabelConfig = require('./createBabelConfig');

var _createBabelConfig2 = _interopRequireDefault(_createBabelConfig);

var _debug = require('./debug');

var _debug2 = _interopRequireDefault(_debug);

var _errors = require('./errors');

var _utils = require('./utils');

var _webpackBuild = require('./webpackBuild');

var _webpackBuild2 = _interopRequireDefault(_webpackBuild);

var _webpackUtils = require('./webpackUtils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// These match DEFAULT_TEST_DIRS and DEFAULT_TEST_FILES for co-located tests in
// ./createKarmaConfig.js; unfortunately Babel doesn't seem to support reusing
// the same patterns.
const DEFAULT_BABEL_IGNORE_CONFIG = ['.spec.js', '.test.js', '-test.js', '/__tests__/'];

/**
 * Run Babel with generated config written to a temporary .babelrc.
 */
function runBabel(name, { copyFiles, outDir, src }, buildBabelConfig, userConfig, cb) {
  let babelConfig = (0, _createBabelConfig2.default)(buildBabelConfig, userConfig.babel, userConfig.path);
  babelConfig.ignore = DEFAULT_BABEL_IGNORE_CONFIG;

  (0, _debug2.default)('babel config: %s', (0, _utils.deepToString)(babelConfig));

  let args = [src, '--out-dir', outDir, '--quiet'];
  if (copyFiles) {
    args.push('--copy-files');
  }

  _fs2.default.writeFile('.babelrc', JSON.stringify(babelConfig, null, 2), err => {
    if (err) return cb(err);
    let spinner = (0, _ora2.default)(`Creating ${name} build`).start();
    let babel = (0, _crossSpawn2.default)(require.resolve('.bin/babel'), args, { stdio: 'inherit' });
    babel.on('exit', code => {
      let babelError;
      if (code !== 0) {
        spinner.fail();
        babelError = new Error('Babel transpilation failed');
      } else {
        spinner.succeed();
      }
      _fs2.default.unlink('.babelrc', unlinkError => {
        cb(babelError || unlinkError);
      });
    });
  });
}

/**
 * Create development and production UMD builds for <script> tag usage.
 */
function buildUMD(args, buildConfig, userConfig, cb) {
  let spinner = (0, _ora2.default)('Creating UMD builds').start();

  let pkg = require(_path2.default.resolve('package.json'));
  let entry = _path2.default.resolve(args._[1] || 'src/index.js');
  let webpackBuildConfig = {
    babel: buildConfig.babel,
    entry: [userConfig.npm.umd.entry || entry],
    output: {
      filename: `${pkg.name}.js`,
      library: userConfig.npm.umd.global,
      libraryExport: 'default',
      libraryTarget: 'umd',
      path: _path2.default.resolve('umd')
    },
    externals: (0, _webpackUtils.createExternals)(userConfig.npm.umd.externals),
    polyfill: false,
    plugins: {
      banner: (0, _webpackUtils.createBanner)(pkg),
      terser: false
    }
  };

  process.env.NODE_ENV = 'production';
  (0, _webpackBuild2.default)(null, args, webpackBuildConfig, (err, stats1) => {
    if (err) {
      spinner.fail();
      return cb(err);
    }

    if (userConfig.terser === false) {
      spinner.succeed();
      console.log();
      (0, _webpackUtils.logGzippedFileSizes)(stats1);
      return cb();
    }

    webpackBuildConfig.babel = (0, _webpackMerge2.default)(buildConfig.babel, buildConfig.babelProd || {});
    webpackBuildConfig.devtool = 'source-map';
    webpackBuildConfig.output.filename = `${pkg.name}.min.js`;
    webpackBuildConfig.plugins.terser = true;
    (0, _webpackBuild2.default)(null, args, webpackBuildConfig, (err, stats2) => {
      if (err) {
        spinner.fail();
        return cb(err);
      }
      spinner.succeed();
      console.log();
      (0, _webpackUtils.logGzippedFileSizes)(stats1, stats2);
      cb();
    });
  });
}

function moduleBuild(args, buildConfig = {}, cb) {
  // XXX Babel doesn't support passing the path to a babelrc file any more
  if (_fs2.default.existsSync('.babelrc')) {
    throw new _errors.UserError('Unable to build the module as there is a .babelrc in your project\n' + 'nwb needs to write a temporary .babelrc to configure the build');
  }

  let src = _path2.default.resolve('src');
  let pluginConfig = (0, _config.getPluginConfig)(args);
  let userConfig = (0, _config.getUserConfig)(args, { pluginConfig });
  let copyFiles = !!args['copy-files'];

  let tasks = [cb => (0, _cleanModule2.default)(args, cb)];

  // The CommonJS build is enabled by default, and must be explicitly
  // disabled if you don't want it.
  if (userConfig.npm.cjs !== false) {
    tasks.push(cb => runBabel('ES5', { copyFiles, outDir: _path2.default.resolve('lib'), src }, (0, _webpackMerge2.default)(buildConfig.babel, buildConfig.babelDev || {}, {
      // Don't force CommonJS users of the CommonJS build to eat a .require
      commonJSInterop: true,
      // Transpile modules to CommonJS
      modules: 'commonjs',
      // Don't set the path to nwb's babel-runtime, as it will need to be a
      // peerDependency of your module if you use transform-runtime's helpers
      // option.
      setRuntimePath: false,
      // Don't enable webpack-specific plugins
      webpack: false
    }), userConfig, cb));
  }

  // The ES modules build is enabled by default, and must be explicitly
  // disabled if you don't want it.
  if (userConfig.npm.esModules !== false) {
    tasks.push(cb => runBabel('ES modules', { copyFiles, outDir: _path2.default.resolve('es'), src }, (0, _webpackMerge2.default)(buildConfig.babel, buildConfig.babelDev || {}, {
      // Don't set the path to nwb's babel-runtime, as it will need to be a
      // peerDependency of your module if you use transform-runtime's helpers
      // option.
      setRuntimePath: false,
      // Don't enable webpack-specific plugins
      webpack: false
    }), userConfig, cb));
  }

  // The UMD build must be explicitly enabled
  if (userConfig.npm.umd) {
    tasks.push(cb => buildUMD(args, buildConfig, userConfig, cb));
  }

  (0, _runSeries2.default)(tasks, cb);
}
module.exports = exports.default;