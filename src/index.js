const log = require('./utils/log');
global.log = log; // Make log global for easy usage everywhere
global.oaVersion = '0.2';

log('Init', 'OpenAsar v' + oaVersion);

const NodeModule = require('module');
const { join } = require('path');

NodeModule.globalPaths.push(join(__dirname, 'polyfills'));

log('Polyfills', 'Set up polyfills usage');

const appSettings = require('./appSettings');
global.oaConfig = appSettings.getSettings().get('openasar', {});

log('Init', 'Loaded config', oaConfig);

const bootstrap = require('./bootstrap');

bootstrap(); // Start bootstrap