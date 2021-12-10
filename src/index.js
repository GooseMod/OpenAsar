const log = require('./utils/log');
global.log = log; // Make log global for easy usage everywhere
global.oaVersion = '0.2-dev';

log('Init', 'OpenAsar v' + oaVersion);

const appSettings = require('./appSettings');
global.oaConfig = appSettings.getSettings().get('openasar', {});

log('Init', 'Loaded config', oaConfig);

const bootstrap = require('./bootstrap');

bootstrap(); // Start bootstrap