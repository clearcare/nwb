'use strict';

exports.__esModule = true;
exports.COMPAT_CONFIGS = exports.loaderConfigName = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

exports.mergeRuleConfig = mergeRuleConfig;
exports.mergeLoaderConfig = mergeLoaderConfig;
exports.createRuleConfigFactory = createRuleConfigFactory;
exports.createLoaderConfigFactory = createLoaderConfigFactory;
exports.createStyleLoaders = createStyleLoaders;
exports.createRules = createRules;
exports.createExtraRules = createExtraRules;
exports.createPlugins = createPlugins;
exports.getCompatConfig = getCompatConfig;
exports.default = createWebpackConfig;

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _autoprefixer = require('autoprefixer');

var _autoprefixer2 = _interopRequireDefault(_autoprefixer);

var _caseSensitivePathsWebpackPlugin = require('case-sensitive-paths-webpack-plugin');

var _caseSensitivePathsWebpackPlugin2 = _interopRequireDefault(_caseSensitivePathsWebpackPlugin);

var _copyWebpackPlugin = require('copy-webpack-plugin');

var _copyWebpackPlugin2 = _interopRequireDefault(_copyWebpackPlugin);

var _htmlWebpackPlugin = require('html-webpack-plugin');

var _htmlWebpackPlugin2 = _interopRequireDefault(_htmlWebpackPlugin);

var _miniCssExtractPlugin = require('mini-css-extract-plugin');

var _miniCssExtractPlugin2 = _interopRequireDefault(_miniCssExtractPlugin);

var _npmInstallWebpackPlugin = require('@insin/npm-install-webpack-plugin');

var _npmInstallWebpackPlugin2 = _interopRequireDefault(_npmInstallWebpackPlugin);

var _webpack = require('webpack');

var _webpack2 = _interopRequireDefault(_webpack);

var _webpackMerge = require('webpack-merge');

var _webpackMerge2 = _interopRequireDefault(_webpackMerge);

var _createBabelConfig = require('./createBabelConfig');

var _createBabelConfig2 = _interopRequireDefault(_createBabelConfig);

var _debug = require('./debug');

var _debug2 = _interopRequireDefault(_debug);

var _errors = require('./errors');

var _utils = require('./utils');

var _WebpackStatusPlugin = require('./WebpackStatusPlugin');

var _WebpackStatusPlugin2 = _interopRequireDefault(_WebpackStatusPlugin);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; }

const DEFAULT_TERSER_CONFIG = {
  cache: true,
  parallel: true,
  sourceMap: true
};

function createTerserConfig(userWebpackConfig) {
  if (userWebpackConfig.debug) {
    return (0, _webpackMerge2.default)(DEFAULT_TERSER_CONFIG, {
      terserOptions: {
        output: {
          beautify: true
        },
        mangle: false
      }
    },
    // Preserve user 'compress' config if present, as it affects what gets
    // removed from the production build.
    typeof userWebpackConfig.terser === 'object' && typeof userWebpackConfig.terser.terserConfig === 'object' && 'compress' in userWebpackConfig.terser.terserConfig ? { terserOptions: { compress: userWebpackConfig.terser.terserConfig.compress } } : {});
  }
  return (0, _webpackMerge2.default)(DEFAULT_TERSER_CONFIG, typeof userWebpackConfig.terser === 'object' ? userWebpackConfig.terser : {});
}

/**
 * Merge webpack rule config objects.
 */
function mergeRuleConfig(defaultConfig, buildConfig = {}, userConfig = {}) {
  let rule;
  // Omit the default loader and options if the user is configuring their own
  if (defaultConfig.loader && (userConfig.loader || userConfig.use)) {
    let {
      loader: defaultLoader, options: defaultOptions } = defaultConfig,
        defaultRuleConfig = _objectWithoutProperties(defaultConfig, ['loader', 'options']);
    rule = (0, _webpackMerge2.default)(defaultRuleConfig, userConfig);
  } else {
    rule = (0, _utils.replaceArrayMerge)(defaultConfig, buildConfig, userConfig);
  }
  if (rule.options && Object.keys(rule.options).length === 0) {
    delete rule.options;
  }
  return rule;
}

/**
 * Merge webpack loader config objects.
 */
function mergeLoaderConfig(defaultConfig, buildConfig = {}, userConfig = {}) {
  let loader;
  // If the loader is being changed, only use the provided config
  if (userConfig.loader) {
    loader = _extends({}, userConfig);
  } else {
    // The only arrays used in default options are for PostCSS plugins, which we
    // want the user to be able to completely override.
    loader = (0, _utils.replaceArrayMerge)(defaultConfig, buildConfig, userConfig);
  }
  if (loader.options && Object.keys(loader.options).length === 0) {
    delete loader.options;
  }
  return loader;
}

/**
 * Create a function which configures a rule identified by a unique id, with
 * the option to override defaults with build-specific and user config.
 */
function createRuleConfigFactory(buildConfig = {}, userConfig = {}) {
  return function (id, defaultConfig) {
    if (id) {
      // Allow the user to turn off rules by configuring them with false
      if (userConfig[id] === false) {
        return null;
      }
      let rule = mergeRuleConfig(defaultConfig, buildConfig[id], userConfig[id]);
      return rule;
    }
    return defaultConfig;
  };
}

/**
 * Create a function which configures a loader identified by a unique id, with
 * the option to override defaults with build-specific and user config.
 */
function createLoaderConfigFactory(buildConfig = {}, userConfig = {}) {
  return function (id, defaultConfig) {
    if (id) {
      let loader = mergeLoaderConfig(defaultConfig, buildConfig[id], userConfig[id]);
      return loader;
    }
    return defaultConfig;
  };
}

/**
 * Create a function which applies a prefix to a name when a prefix is given,
 * unless the prefix ends with the name, in which case the prefix itself is
 * returned.
 * The latter rule is to allow rules created for CSS preprocessor plugins to
 * be given unique ids for user configuration without duplicating the name of
 * the rule.
 * e.g.: loaderConfigName('sass')('css') => 'sass-css'
 *       loaderConfigName('sass')('sass') => 'sass' (as opposed to 'sass-sass')
 */
let loaderConfigName = exports.loaderConfigName = prefix => name => {
  if (prefix && prefix.endsWith(name)) {
    return prefix;
  }
  return prefix ? `${prefix}-${name}` : name;
};

/**
 * Create a list of chained loader config objects for a static build (default)
 * or serving.
 */
function createStyleLoaders(createLoader, userWebpackConfig, options = {}) {
  let {
    preprocessor = null,
    prefix = null,
    server = false
  } = options;
  let name = loaderConfigName(prefix);
  let styleLoader = createLoader(name('style'), {
    loader: require.resolve('style-loader'),
    options: {
      // Only enable style-loader HMR when we're serving a development build
      hmr: Boolean(server)
    }
  });
  let loaders = [createLoader(name('css'), {
    loader: require.resolve('css-loader'),
    options: {
      // Apply postcss-loader to @imports
      importLoaders: 1
    }
  }), createLoader(name('postcss'), {
    loader: require.resolve('postcss-loader'),
    options: {
      ident: name('postcss'),
      plugins: createDefaultPostCSSPlugins(userWebpackConfig)
    }
  })];

  if (preprocessor) {
    loaders.push(createLoader(preprocessor.id ? name(preprocessor.id) : null, preprocessor.config));
  }

  if (server || userWebpackConfig.extractCSS === false) {
    loaders.unshift(styleLoader);
    return loaders;
  } else {
    loaders.unshift(createLoader(name('extract-css'), {
      loader: _miniCssExtractPlugin2.default.loader
    }));
    return loaders;
  }
}

/**
 * Create style rules. By default, creates a single rule for .css files and for
 * any style preprocessor plugins present. The user can configure this to create
 * multiple rules if needed.
 */
function createStyleRules(server, userWebpackConfig, pluginConfig, createRule, createLoader) {
  let styleConfig = userWebpackConfig.styles || {};
  let styleRules = [];

  // Configured styles rules, with individual loader configuration as part of
  // the definition.
  Object.keys(styleConfig).forEach(type => {
    let test, preprocessor;
    if (type === 'css') {
      test = /\.css$/;
    } else {
      let preprocessorConfig = pluginConfig.cssPreprocessors[type];
      test = preprocessorConfig.test;
      preprocessor = { id: null, config: { loader: preprocessorConfig.loader } };
    }
    let ruleConfigs = [].concat(...styleConfig[type]);
    ruleConfigs.forEach(ruleConfig => {
      let { loaders: loaderConfig } = ruleConfig,
          topLevelRuleConfig = _objectWithoutProperties(ruleConfig, ['loaders']);
      // Empty build config, as all loader config for custom style rules will be
      // provided by the user.
      let styleRuleLoader = createLoaderConfigFactory({}, loaderConfig);
      styleRules.push(_extends({
        test,
        use: createStyleLoaders(styleRuleLoader, userWebpackConfig, { preprocessor, server })
      }, topLevelRuleConfig));
    });
  });

  // Default CSS rule when nothing is configured, tweakable via webpack.rules by
  // unique id.
  if (!('css' in styleConfig)) {
    styleRules.push(createRule('css-rule', {
      test: /\.css$/,
      use: createStyleLoaders(createLoader, userWebpackConfig, { server })
    }));
  }

  // Default rule for each CSS preprocessor plugin when nothing is configured,
  // tweakable via webpack.rules by unique id.
  if (pluginConfig.cssPreprocessors) {
    Object.keys(pluginConfig.cssPreprocessors).forEach(id => {
      if (id in styleConfig) return;
      let { test, loader: preprocessorLoader } = pluginConfig.cssPreprocessors[id];
      styleRules.push(createRule(`${id}-rule`, {
        test,
        use: createStyleLoaders(createLoader, userWebpackConfig, {
          prefix: id,
          preprocessor: { id, config: { loader: preprocessorLoader } },
          server
        })
      }));
    });
  }

  return styleRules;
}

/**
 * Final webpack rules config consists of:
 * - the default set of rules created in this function, with build and user
 *   config tweaks based on rule id.
 * - extra rules defined in build config, with user config tweaks based
 *   on rule id.
 * - extra rules created for CSS preprocessor plugins, with user config
 *   tweaks based on loader id.
 * - extra rules defined in user config.
 */
function createRules(server, buildConfig = {}, userWebpackConfig = {}, pluginConfig = {}) {
  let createRule = createRuleConfigFactory(buildConfig, userWebpackConfig.rules);
  let createLoader = createLoaderConfigFactory(buildConfig, userWebpackConfig.rules);

  // Default options for url-loader
  let urlLoaderOptions = {
    // Don't inline anything by default
    limit: 1,
    // Always use a hash to prevent files with the same name causing issues
    name: '[name].[hash:8].[ext]'
  };

  let rules = [createRule('babel', {
    test: /\.js$/,
    loader: require.resolve('babel-loader'),
    exclude: process.env.NWB_TEST ? /(node_modules|nwb[\\/]polyfills\.js$)/ : /node_modules/,
    options: {
      // Don't look for .babelrc files
      babelrc: false,
      // Cache transformations to the filesystem (in default temp dir)
      cacheDirectory: true
    }
  }), createRule('graphics', {
    test: /\.(gif|png|webp)$/,
    loader: require.resolve('url-loader'),
    options: _extends({}, urlLoaderOptions)
  }), createRule('svg', {
    test: /\.svg$/,
    loader: require.resolve('url-loader'),
    options: _extends({}, urlLoaderOptions)
  }), createRule('jpeg', {
    test: /\.jpe?g$/,
    loader: require.resolve('url-loader'),
    options: _extends({}, urlLoaderOptions)
  }), createRule('fonts', {
    test: /\.(eot|otf|ttf|woff|woff2)$/,
    loader: require.resolve('url-loader'),
    options: _extends({}, urlLoaderOptions)
  }), createRule('video', {
    test: /\.(mp4|ogg|webm)$/,
    loader: require.resolve('url-loader'),
    options: _extends({}, urlLoaderOptions)
  }), createRule('audio', {
    test: /\.(wav|mp3|m4a|aac|oga)$/,
    loader: require.resolve('url-loader'),
    options: _extends({}, urlLoaderOptions)
  }),
  // Extra rules from build config, still configurable via user config when
  // the rules specify an id.
  ...createExtraRules(buildConfig.extra, userWebpackConfig.rules)];

  // Add rules with chained style loaders, using MiniCssExtractPlugin for builds
  if (userWebpackConfig.styles !== false) {
    rules = rules.concat(createStyleRules(server, userWebpackConfig, pluginConfig, createRule, createLoader));
  }

  return rules.filter(Boolean);
}

/**
 * Create rules from rule definitions which may include an id attribute for
 * user customisation. It's assumed these are being created from build config.
 */
function createExtraRules(extraRules = [], userConfig = {}) {
  let createRule = createRuleConfigFactory({}, userConfig);
  return extraRules.map(extraRule => {
    let { id } = extraRule,
        ruleConfig = _objectWithoutProperties(extraRule, ['id']);
    return createRule(id, ruleConfig);
  });
}

/**
 * Plugin for HtmlPlugin which inlines the Webpack runtime code and chunk
 * manifest into the HTML in a <script> tag before other emitted asssets are
 * injected by HtmlPlugin itself.
 */
function inlineRuntimePlugin() {
  this.hooks.compilation.tap('inlineRuntimePlugin', compilation => {
    compilation.hooks.htmlWebpackPluginBeforeHtmlProcessing.tapAsync('inlineRuntimePlugin', (data, cb) => {
      Object.keys(compilation.assets).forEach(key => {
        if (!/^runtime\.[a-z\d]+\.js$/.test(key)) return;
        let { children } = compilation.assets[key];
        if (children && children[0]) {
          data.html = data.html.replace(/^(\s*)<\/body>/m, `$1<script>${children[0]._value}</script>\n$1</body>`);
          // Remove the runtime from HtmlPlugin's assets to prevent a <script>
          // tag being created for it.
          var runtimeIndex = data.assets.js.indexOf(data.assets.publicPath + key);
          data.assets.js.splice(runtimeIndex, 1);
          delete data.assets.chunks.runtime;
        }
      });
      cb(null, data);
    });
  });
}

function getCopyPluginArgs(buildConfig, userConfig) {
  let patterns = [];
  let options = {};
  if (buildConfig) {
    patterns = patterns.concat(buildConfig);
  }
  if (userConfig) {
    patterns = patterns.concat(userConfig.patterns || []);
    options = userConfig.options || {};
  }
  return [patterns, options];
}

/**
 * Final webpack plugin config consists of:
 * - the default set of plugins created by this function based on whether or not
 *   a server build is being configured, whether or not the build is for an
 *   app (for which HTML will be generated), plus environment variables.
 * - extra plugins managed by this function, whose inclusion is triggered by
 *   build config, which provides default configuration for them which can be
 *   tweaked by user plugin config when appropriate.
 * - any extra plugins defined in build and user config (extra user plugins are
 *   not handled here, but by the final merge of webpack.extra config).
 */
function createPlugins(server, buildConfig = {}, userConfig = {}) {
  let production = process.env.NODE_ENV === 'production';

  let optimization = {};
  let plugins = [
  // Enforce case-sensitive import paths
  new _caseSensitivePathsWebpackPlugin2.default(),
  // Replace specified expressions with values
  new _webpack2.default.DefinePlugin(_extends({
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  }, buildConfig.define, userConfig.define)),
  // XXX Workaround until loaders migrate away from using this.options
  new _webpack2.default.LoaderOptionsPlugin({
    options: {
      context: process.cwd()
    }
  })];

  if (server) {
    // HMR is enabled by default but can be explicitly disabled
    if (server.hot !== false) {
      plugins.push(new _webpack2.default.HotModuleReplacementPlugin());
      optimization.noEmitOnErrors = true;
    }
    if (buildConfig.status) {
      plugins.push(new _WebpackStatusPlugin2.default(buildConfig.status));
    }
  }
  // If we're not serving, we're creating a static build
  else {
      if (userConfig.extractCSS !== false) {
        // Extract imported stylesheets out into .css files
        plugins.push(new _miniCssExtractPlugin2.default(_extends({
          filename: production ? `[name].[contenthash:8].css` : '[name].css'
        }, userConfig.extractCSS)));
      }

      // Move modules imported from node_modules/ into a vendor chunk when enabled
      if (buildConfig.vendor) {
        optimization.splitChunks = {
          // Split the entry chunk too
          chunks: 'all',
          // A 'vendors' cacheGroup will get defaulted if it doesn't exist, so
          // we override it to explicitly set the chunk name.
          cacheGroups: {
            vendors: {
              name: 'vendor',
              priority: -10,
              test: /[\\/]node_modules[\\/]/
            }
          }
        };
      }
    }

  if (production) {
    plugins.push(new _webpack2.default.LoaderOptionsPlugin({
      debug: false,
      minimize: true
    }));
    optimization.minimize = buildConfig.terser !== false && userConfig.terser !== false;
    if (buildConfig.terser !== false && userConfig.terser !== false) {
      optimization.minimizer = [{
        apply(compiler) {
          // Lazy load the terser plugin
          let TerserPlugin = require('terser-webpack-plugin');
          new TerserPlugin(createTerserConfig(userConfig)).apply(compiler);
        }
      }];
    }
  }

  // Generate an HTML file for web apps which pulls in generated resources
  if (buildConfig.html) {
    plugins.push(new _htmlWebpackPlugin2.default(_extends({
      chunksSortMode: 'dependency',
      template: _path2.default.join(__dirname, '../templates/webpack-template.html')
    }, buildConfig.html, userConfig.html)));
    // Extract the Webpack runtime and manifest into its own chunk
    // The default runtime chunk name is 'runtime' with this configuration
    optimization.runtimeChunk = 'single';
    // Inline the runtime and manifest
    plugins.push(inlineRuntimePlugin);
  }

  // Copy static resources
  if (buildConfig.copy || userConfig.copy) {
    plugins.push(new _copyWebpackPlugin2.default(...getCopyPluginArgs(buildConfig.copy, userConfig.copy)));
  }

  // Automatically install missing npm dependencies and add them to package.json
  // if present.
  // Must be enabled with an --install or --auto-install flag.
  if (buildConfig.autoInstall) {
    plugins.push(new _npmInstallWebpackPlugin2.default(_extends({
      peerDependencies: false,
      quiet: true
    }, userConfig.install)));
  }

  // Insert a banner comment at the top of generated files - used for UMD builds
  if (buildConfig.banner) {
    plugins.push(new _webpack2.default.BannerPlugin({ banner: buildConfig.banner }));
  }

  // Escape hatch for any extra plugins a particular build ever needs to add
  if (buildConfig.extra) {
    plugins = plugins.concat(buildConfig.extra);
  }

  return { optimization, plugins };
}

function createDefaultPostCSSPlugins(userWebpackConfig) {
  return [(0, _autoprefixer2.default)(_extends({
    browsers: ['>1%', 'last 4 versions', 'Firefox ESR', 'not ie < 9']
  }, userWebpackConfig.autoprefixer))];
}

const COMPAT_CONFIGS = exports.COMPAT_CONFIGS = {
  intl(options) {
    return {
      plugins: [new _webpack2.default.ContextReplacementPlugin(/intl[/\\]locale-data[/\\]jsonp$/, new RegExp(`^\\.\\/(${options.locales.join('|')})$`))]
    };
  },
  moment(options) {
    return {
      plugins: [new _webpack2.default.ContextReplacementPlugin(/moment[/\\]locale$/, new RegExp(`^\\.\\/(${options.locales.join('|')})$`))]
    };
  },
  'react-intl'(options) {
    return {
      plugins: [new _webpack2.default.ContextReplacementPlugin(/react-intl[/\\]locale-data$/, new RegExp(`^\\.\\/(${options.locales.join('|')})$`))]
    };
  }
};

/**
 * Create a chunk of webpack config containing compatibility tweaks for
 * libraries which are known to cause issues, to be merged into the generated
 * config.
 * Returns null if there's nothing to merge based on user config.
 */
function getCompatConfig(userCompatConfig = {}) {
  let configs = [];
  Object.keys(userCompatConfig).map(lib => {
    if (!userCompatConfig[lib]) return;
    let compatConfig = COMPAT_CONFIGS[lib];
    if ((0, _utils.typeOf)(compatConfig) === 'function') {
      compatConfig = compatConfig(userCompatConfig[lib]);
      if (!compatConfig) return;
    }
    configs.push(compatConfig);
  });
  if (configs.length === 0) return null;
  if (configs.length === 1) return _extends({}, configs[0]);
  return (0, _webpackMerge2.default)(...configs);
}

/**
 * Add default polyfills to the head of the entry array.
 */
function addPolyfillsToEntry(entry) {
  if ((0, _utils.typeOf)(entry) === 'array') {
    entry.unshift(require.resolve('../polyfills'));
  } else {
    // Assumption: there will only be one entry point, naming the entry chunk
    entry[Object.keys(entry)[0]].unshift(require.resolve('../polyfills'));
  }
}

/**
 * Create a webpack config with a curated set of default rules suitable for
 * creating a static build (default) or serving an app with hot reloading.
 */
function createWebpackConfig(buildConfig, pluginConfig = {}, userConfig = {}) {
  (0, _debug2.default)('createWebpackConfig buildConfig: %s', (0, _utils.deepToString)(buildConfig));

  // Final webpack config is primarily driven by build configuration for the nwb
  // command being run. Each command configures a default, working webpack
  // configuration for the task it needs to perform.
  let {
    // These build config items are used to create chunks of webpack config,
    // rather than being included as-is.
    babel: buildBabelConfig = {},
    entry,
    output: buildOutputConfig,
    polyfill: buildPolyfill,
    plugins: buildPluginConfig = {},
    resolve: buildResolveConfig = {},
    rules: buildRulesConfig = {},
    server = false
  } = buildConfig,
      otherBuildConfig = _objectWithoutProperties(buildConfig, ['babel', 'entry', 'output', 'polyfill', 'plugins', 'resolve', 'rules', 'server']);

  let userWebpackConfig = userConfig.webpack || {};
  let userOutputConfig = {};
  if ('publicPath' in userWebpackConfig) {
    userOutputConfig.publicPath = userWebpackConfig.publicPath;
  }
  let userResolveConfig = {};
  if (userWebpackConfig.aliases) {
    userResolveConfig.alias = userWebpackConfig.aliases;
  }

  // Generate config for babel-loader and set it as loader config for the build
  buildRulesConfig.babel = { options: (0, _createBabelConfig2.default)(buildBabelConfig, userConfig.babel, userConfig.path) };

  let webpackConfig = _extends({
    mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    module: {
      rules: createRules(server, buildRulesConfig, userWebpackConfig, pluginConfig),
      strictExportPresence: true
    },
    output: _extends({}, buildOutputConfig, userOutputConfig),
    performance: {
      hints: false
    }
  }, createPlugins(server, buildPluginConfig, userWebpackConfig), {
    resolve: (0, _webpackMerge2.default)(buildResolveConfig, userResolveConfig),
    resolveLoader: {
      modules: ['node_modules', _path2.default.join(__dirname, '../node_modules')]
    }
  }, otherBuildConfig);

  if (entry) {
    // Add default polyfills to the entry chunk unless configured not to
    if (buildPolyfill !== false && userConfig.polyfill !== false) {
      addPolyfillsToEntry(entry);
    }
    webpackConfig.entry = entry;
  }

  // Create and merge compatibility configuration into the generated config if
  // specified.
  if (userWebpackConfig.compat) {
    let compatConfig = getCompatConfig(userWebpackConfig.compat);
    if (compatConfig) {
      webpackConfig = (0, _webpackMerge2.default)(webpackConfig, compatConfig);
    }
  }

  // Any extra user webpack config is merged into the generated config to give
  // them even more control.
  if (userWebpackConfig.extra) {
    webpackConfig = (0, _webpackMerge2.default)(webpackConfig, userWebpackConfig.extra);
  }

  // Finally, give them a chance to do whatever they want with the generated
  // config.
  if ((0, _utils.typeOf)(userWebpackConfig.config) === 'function') {
    webpackConfig = userWebpackConfig.config(webpackConfig);
    if (!webpackConfig) {
      throw new _errors.UserError(`webpack.config() in ${userConfig.path} didn't return anything - it must return the Webpack config object.`);
    }
  }

  return webpackConfig;
}