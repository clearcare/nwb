'use strict';

exports.__esModule = true;
exports.createBanner = createBanner;
exports.createExternals = createExternals;
exports.logBuildResults = logBuildResults;
exports.logErrorsAndWarnings = logErrorsAndWarnings;
exports.logGzippedFileSizes = logGzippedFileSizes;

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _chalk = require('chalk');

var _chalk2 = _interopRequireDefault(_chalk);

var _figures = require('figures');

var _figures2 = _interopRequireDefault(_figures);

var _filesize = require('filesize');

var _filesize2 = _interopRequireDefault(_filesize);

var _gzipSize = require('gzip-size');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const FRIENDLY_SYNTAX_ERROR_LABEL = 'Syntax error:';

let s = n => n === 1 ? '' : 's';

/**
 * Create a banner comment for a UMD build file from package.json config.
 */
function createBanner(pkg) {
  let banner = `${pkg.name} v${pkg.version}`;
  if (pkg.homepage) {
    banner += ` - ${pkg.homepage}`;
  }
  if (pkg.license) {
    banner += `\n${pkg.license} Licensed`;
  }
  return banner;
}

/**
 * Create Webpack externals config from a module → global variable mapping.
 */
function createExternals(externals = {}) {
  return Object.keys(externals).reduce((webpackExternals, packageName) => {
    let globalName = externals[packageName];
    webpackExternals[packageName] = {
      root: globalName,
      commonjs2: packageName,
      commonjs: packageName,
      amd: packageName
    };
    return webpackExternals;
  }, {});
}

function formatMessage(message) {
  return message
  // Make some common errors shorter:
  .replace(
  // Babel syntax error
  'Module build failed: SyntaxError:', FRIENDLY_SYNTAX_ERROR_LABEL).replace(
  // Webpack file not found error
  /Module not found: Error: Cannot resolve 'file' or 'directory'/, 'Module not found:')
  // Webpack loader names obscure CSS filenames
  .replace(/^.*css-loader.*!/gm, '');
}

function isLikelyASyntaxError(message) {
  return message.includes(FRIENDLY_SYNTAX_ERROR_LABEL);
}

function formatMessages(messages, type) {
  return messages.map(message => `${type} in ${formatMessage(message)}`);
}

function getFileDetails(stats) {
  let outputPath = stats.compilation.outputOptions.path;
  return Object.keys(stats.compilation.assets).filter(assetName => /\.(css|js)$/.test(assetName)).map(assetName => {
    let size = (0, _gzipSize.sync)(stats.compilation.assets[assetName].source());
    return {
      dir: _path2.default.dirname(_path2.default.join(_path2.default.relative(process.cwd(), outputPath), assetName)),
      name: _path2.default.basename(assetName),
      size,
      sizeLabel: (0, _filesize2.default)(size)
    };
  });
}

function logBuildResults(stats, spinner) {
  if (stats.hasErrors()) {
    if (spinner) {
      spinner.fail();
      console.log();
    }
    logErrorsAndWarnings(stats);
  } else if (stats.hasWarnings()) {
    if (spinner) {
      spinner.stopAndPersist({ symbol: _chalk2.default.yellow(_figures2.default.warning) });
      console.log();
    }
    logErrorsAndWarnings(stats);
    console.log();
    logGzippedFileSizes(stats);
  } else {
    if (spinner) {
      spinner.succeed();
      console.log();
    }
    logGzippedFileSizes(stats);
  }
}

function logErrorsAndWarnings(stats) {
  // Show fewer error details
  let json = stats.toJson({}, true);

  let formattedErrors = formatMessages(json.errors, _chalk2.default.bgRed.white(' ERROR '));
  let formattedWarnings = formatMessages(json.warnings, _chalk2.default.bgYellow.black(' WARNING '));

  if (stats.hasErrors()) {
    let errors = formattedErrors.length;
    console.log(_chalk2.default.red(`Failed to compile with ${errors} error${s(errors)}.`));
    if (formattedErrors.some(isLikelyASyntaxError)) {
      // If there are any syntax errors, show just them.
      // This prevents a confusing ESLint parsing error preceding a much more
      // useful Babel syntax error.
      formattedErrors = formattedErrors.filter(isLikelyASyntaxError);
    }
    formattedErrors.forEach(message => {
      console.log();
      console.log(message);
    });
    return;
  }

  if (stats.hasWarnings()) {
    let warnings = formattedWarnings.length;
    console.log(_chalk2.default.yellow(`Compiled with ${warnings} warning${s(warnings)}.`));
    formattedWarnings.forEach(message => {
      console.log();
      console.log(message);
    });
  }
}

/**
 * Take any number of Webpack Stats objects and log the gzipped size of the JS
 * and CSS assets they contain, largest-first.
 */
function logGzippedFileSizes(...stats) {
  let files = stats.reduce((files, stats) => files.concat(getFileDetails(stats)), []).filter(({ name }) => !/^runtime\.[a-z\d]+\.js$/.test(name));

  let longest = files.reduce((max, { dir, name }) => {
    let length = (dir + name).length;
    return length > max ? length : max;
  }, 0);
  let pad = (dir, name) => Array(longest - (dir + name).length + 1).join(' ');

  console.log(`File size${s(files.length)} after gzip:`);
  console.log();

  files.sort((a, b) => b.size - a.size).forEach(({ dir, name, sizeLabel }) => {
    console.log(`  ${_chalk2.default.dim(`${dir}${_path2.default.sep}`)}${_chalk2.default.cyan(name)}` + `  ${pad(dir, name)}${_chalk2.default.green(sizeLabel)}`);
  });

  console.log();
}