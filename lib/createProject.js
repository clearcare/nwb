'use strict';

exports.__esModule = true;
exports.getNpmModulePrefs = getNpmModulePrefs;
exports.validateProjectType = validateProjectType;
exports.default = createProject;

var _child_process = require('child_process');

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _chalk = require('chalk');

var _chalk2 = _interopRequireDefault(_chalk);

var _copyTemplateDir = require('copy-template-dir');

var _copyTemplateDir2 = _interopRequireDefault(_copyTemplateDir);

var _inquirer = require('inquirer');

var _inquirer2 = _interopRequireDefault(_inquirer);

var _ora = require('ora');

var _ora2 = _interopRequireDefault(_ora);

var _runSeries = require('run-series');

var _runSeries2 = _interopRequireDefault(_runSeries);

var _constants = require('./constants');

var _errors = require('./errors');

var _package = require('../package.json');

var _package2 = _interopRequireDefault(_package);

var _utils = require('./utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// TODO Change if >= 1.0.0 ever happens
const NWB_VERSION = _package2.default.version.split('.').slice(0, 2).concat('x').join('.');

/**
 * Copy a project template and log created files if successful.
 */
function copyTemplate(templateDir, targetDir, templateVars, cb) {
  (0, _copyTemplateDir2.default)(templateDir, targetDir, templateVars, (err, createdFiles) => {
    if (err) return cb(err);
    createdFiles.sort().forEach(createdFile => {
      let relativePath = _path2.default.relative(targetDir, createdFile);
      console.log(`  ${_chalk2.default.green('create')} ${relativePath}`);
    });
    cb();
  });
}

/**
 * Prompt the user for preferences related to publishing a module to npm, unless
 * they've asked us not to or have already provided all the possible options via
 * arguments.
 */
function getNpmModulePrefs(args, cb) {
  // An ES modules build is enabled by default, but can be disabled with
  // --no-es-modules or --es-modules=false (or a bunch of other undocumented
  // stuff)
  let esModules = args['es-modules'] !== false && !/^(0|false|no|nope|off)$/.test(args['es-modules']);
  // Pass a UMD global variable name with --umd=MyThing, or pass --no-umd to
  // indicate you don't want a UMD build.
  let umd = (0, _utils.typeOf)(args.umd) === 'string' ? args.umd : false;

  // Don't ask questions if the user doesn't want them, or already told us all
  // the answers.
  if (args.f || args.force || 'umd' in args && 'es-modules' in args) {
    return process.nextTick(cb, null, { umd, esModules });
  }

  _inquirer2.default.prompt([{
    when: () => !('es-modules' in args),
    type: 'confirm',
    name: 'esModules',
    message: 'Do you want to create an ES modules build for use by compatible bundlers?',
    default: esModules
  }, {
    when: () => !('umd' in args),
    type: 'confirm',
    name: 'createUMD',
    message: 'Do you want to create a UMD build for global usage via <script> tag?',
    default: umd
  }, {
    when: ({ createUMD }) => createUMD,
    type: 'input',
    name: 'umd',
    message: 'Which global variable should the UMD build set?',
    validate(input) {
      return input.trim() ? true : 'Required to create a UMD build';
    },
    default: umd || ''
  }]).then(answers => cb(null, answers), err => cb(err));
}

/**
 * Initialise a Git repository if the user has Git, unless there's already one
 * present or the user has asked us could we not.
 */
function initGit(args, cwd, cb) {
  // Allow git init to be disabled with a --no-git flag
  if (args.git === false) {
    return process.nextTick(cb);
  }
  // Bail if a git repo already exists (e.g. nwb init in an existing repo)
  if ((0, _utils.directoryExists)(_path2.default.join(cwd, '.git'))) {
    return process.nextTick(cb);
  }

  (0, _child_process.exec)('git --version', { cwd, stdio: 'ignore' }, err => {
    if (err) return cb();
    let spinner = (0, _ora2.default)('Initing Git repo').start();
    (0, _runSeries2.default)([cb => (0, _child_process.exec)('git init', { cwd }, cb), cb => (0, _child_process.exec)('git add .', { cwd }, cb), cb => (0, _child_process.exec)(`git commit -m "Initial commit from nwb v${_package2.default.version}"`, { cwd }, cb)], err => {
      if (err) {
        spinner.fail();
        console.log(_chalk2.default.red(err.message));
        return cb();
      }
      spinner.succeed();
      cb();
    });
  });
}

/**
 * Validate a user-supplied project type.
 */
function validateProjectType(projectType) {
  if (!projectType) {
    throw new _errors.UserError(`A project type must be provided, one of: ${[..._constants.PROJECT_TYPES].join(', ')}`);
  }
  if (!_constants.PROJECT_TYPES.has(projectType)) {
    throw new _errors.UserError(`Project type must be one of: ${[..._constants.PROJECT_TYPES].join(', ')}`);
  }
}

/**
 * Write an nwb config file.
 */
function writeConfigFile(dir, config, cb) {
  _fs2.default.writeFile(_path2.default.join(dir, _constants.CONFIG_FILE_NAME), `module.exports = ${(0, _utils.toSource)(config)}\n`, cb);
}

const MODULE_PROJECT_CONFIG = {
  [_constants.REACT_COMPONENT]: {
    devDependencies: ['react', 'react-dom'],
    externals: { react: 'React' }
  },
  [_constants.WEB_MODULE]: {}

  /**
   * Create an app project skeleton.
   */
};function createAppProject(args, projectType, name, targetDir, cb) {
  let appType = projectType.split('-')[0];
  let projectConfig = require(`./${appType}`)(args);

  let dependencies = null;

  let tasks = [cb => {
    let templateDir = _path2.default.join(__dirname, `../templates/${projectType}`);
    let templateVars = { name, nwbVersion: NWB_VERSION };
    copyTemplate(templateDir, targetDir, templateVars, cb);
  }, cb => {
    // Allow specification of the exact version, e.g. --react=16.2
    if (dependencies.length !== 0 && args[appType]) {
      dependencies = dependencies.map(pkg => `${pkg}@${args[appType]}`);
    }
    (0, _utils.install)(dependencies, { cwd: targetDir, save: true }, cb);
  }, cb => initGit(args, targetDir, cb)];

  let questions = projectConfig.getProjectQuestions();
  if (questions) {
    // Don't ask questions if the user doesn't want them
    if (args.f || args.force) {
      dependencies = projectConfig.getProjectDependencies(projectConfig.getProjectDefaults());
    } else {
      tasks.unshift(cb => {
        _inquirer2.default.prompt(questions).then(answers => {
          dependencies = projectConfig.getProjectDependencies(answers);
          cb(null);
        }, err => cb(err));
      });
    }
  } else {
    dependencies = projectConfig.getProjectDependencies();
  }

  (0, _runSeries2.default)(tasks, cb);
}

/**
 * Create an npm module project skeleton.
 */
function createModuleProject(args, projectType, name, targetDir, cb) {
  let { devDependencies = [], externals = {} } = MODULE_PROJECT_CONFIG[projectType];
  getNpmModulePrefs(args, (err, prefs) => {
    if (err) return cb(err);
    let { umd, esModules } = prefs;
    let templateDir = _path2.default.join(__dirname, `../templates/${projectType}`);
    let templateVars = {
      name,
      esModules,
      esModulesPackageConfig: esModules ? '\n  "module": "es/index.js",' : '',
      nwbVersion: NWB_VERSION
    };
    let nwbConfig = {
      type: projectType,
      npm: {
        esModules,
        umd: umd ? { global: umd, externals } : false
      }

      // CBA making this part generic until it's needed
    };if (projectType === _constants.REACT_COMPONENT) {
      if (args.react) {
        devDependencies = devDependencies.map(pkg => `${pkg}@${args.react}`);
        templateVars.reactPeerVersion = `^${args.react}`; // YOLO
      } else {
        // TODO Get from npm so we don't have to manually update on major releases
        templateVars.reactPeerVersion = '16.x';
      }
    }

    (0, _runSeries2.default)([cb => copyTemplate(templateDir, targetDir, templateVars, cb), cb => writeConfigFile(targetDir, nwbConfig, cb), cb => (0, _utils.install)(devDependencies, { cwd: targetDir, save: true, dev: true }, cb), cb => initGit(args, targetDir, cb)], cb);
  });
}

function createProject(args, projectType, name, dir, cb) {
  if (/-app$/.test(projectType)) {
    return createAppProject(args, projectType, name, dir, cb);
  } else {
    createModuleProject(args, projectType, name, dir, cb);
  }
}