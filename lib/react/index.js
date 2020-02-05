'use strict';

exports.__esModule = true;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _utils = require('../utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function getBaseConfig() {
  return {
    babel: {
      presets: [require.resolve('babel-preset-react')]
    }
  };
}

function getBaseDependencies() {
  return ['react', 'react-dom'];
}

function getBuildConfig(args, options = {}) {
  let config = getBaseConfig();

  if (process.env.NODE_ENV === 'production') {
    // User-configurable, so handled by createBabelConfig
    config.babel.presets.push('react-prod');
  }

  let aliasPath = options.useModulePath ? _utils.modulePath : alias => alias;

  if (args.inferno || args['inferno-compat']) {
    config.resolve = {
      alias: {
        'react': aliasPath('inferno-compat'),
        'react-dom': aliasPath('inferno-compat')
      }
    };
  } else if (args.preact || args['preact-compat']) {
    // Use the path to preact-compat.js, as using the path to the preact-compat
    // module picks up the "module" build, which prevents hijacking the render()
    // function in the render shim.
    let preactCompathPath = _path2.default.join(aliasPath('preact-compat'), 'dist/preact-compat');
    config.resolve = {
      alias: {
        'react': preactCompathPath,
        'react-dom': preactCompathPath,
        'create-react-class': 'preact-compat/lib/create-react-class'
      }
    };
  }

  return config;
}

class ReactConfig {

  constructor(args) {
    this.getName = () => {
      if (/^build/.test(this._args._[0])) {
        return this._getCompatName();
      }
      return 'React';
    };

    this.getBuildDependencies = () => {
      return this._getCompatDependencies();
    };

    this.getBuildConfig = () => {
      return getBuildConfig(this._args);
    };

    this.getServeConfig = () => {
      let config = getBaseConfig();
      config.babel.presets.push(require.resolve('./react-dev-preset'));

      if (this._args.hmr !== false && this._args.hmre !== false) {
        config.babel.presets.push(require.resolve('./react-hmre-preset'));
      }

      return config;
    };

    this.getQuickDependencies = () => {
      let deps = getBaseDependencies();
      if (/^build/.test(this._args._[0])) {
        deps = deps.concat(this._getCompatDependencies());
      }
      return deps;
    };

    this.getQuickBuildConfig = () => {
      return _extends({
        commandConfig: getBuildConfig(this._args, { useModulePath: true })
      }, this._getQuickConfig());
    };

    this.getQuickServeConfig = () => {
      return _extends({
        commandConfig: this.getServeConfig()
      }, this._getQuickConfig());
    };

    this._args = args;
  }

  _getCompatDependencies() {
    if (this._args.inferno || this._args['inferno-compat']) {
      return ['inferno', 'inferno-compat', 'inferno-clone-vnode', 'inferno-create-class', 'inferno-create-element'];
    } else if (this._args.preact || this._args['preact-compat']) {
      return ['preact', 'preact-compat'];
    }
    return [];
  }

  _getCompatName() {
    if (this._args.inferno || this._args['inferno-compat']) {
      return 'Inferno (React compat)';
    } else if (this._args.preact || this._args['preact-compat']) {
      return 'Preact (React compat)';
    }
    return 'React';
  }

  _getQuickConfig() {
    return {
      defaultTitle: `${this.getName()} App`,
      renderShim: require.resolve('./renderShim'),
      renderShimAliases: {
        'react': (0, _utils.modulePath)('react'),
        'react-dom': (0, _utils.modulePath)('react-dom')
      }
    };
  }

  getProjectDefaults() {
    return {};
  }

  getProjectDependencies() {
    return getBaseDependencies();
  }

  getProjectQuestions() {
    return null;
  }

  getKarmaTestConfig() {
    return getBaseConfig();
  }
}

exports.default = args => new ReactConfig(args);

module.exports = exports.default;