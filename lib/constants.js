'use strict';

exports.__esModule = true;
const CONFIG_FILE_NAME = exports.CONFIG_FILE_NAME = 'nwb.config.js';

const DEFAULT_PORT = exports.DEFAULT_PORT = process.env.PORT || 3000;

const INFERNO_APP = exports.INFERNO_APP = 'inferno-app';
const PREACT_APP = exports.PREACT_APP = 'preact-app';
const REACT_APP = exports.REACT_APP = 'react-app';
const REACT_COMPONENT = exports.REACT_COMPONENT = 'react-component';
const WEB_APP = exports.WEB_APP = 'web-app';
const WEB_MODULE = exports.WEB_MODULE = 'web-module';

const PROJECT_TYPES = exports.PROJECT_TYPES = new Set([INFERNO_APP, PREACT_APP, REACT_APP, REACT_COMPONENT, WEB_APP, WEB_MODULE]);