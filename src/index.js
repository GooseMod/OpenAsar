const log = require('./utils/log');
global.log = log; // Make log global for easy usage everywhere
global.oaVersion = 'nightly';

log('Init', 'OpenAsar', oaVersion);

if (process.resourcesPath.startsWith('/usr/lib/electron')) global.systemElectron = true; // Using system electron, flag for other places
process.resourcesPath = require('path').join(__dirname, '..'); // Force resourcesPath for system electron

require('./paths').init();

global.oaConfig = require('./appSettings').getSettings().get('openasar', {});
require('./cmdSwitches')();

if (process.argv.includes('--overlay-host')) { // If overlay
  require('./utils/u2LoadModulePath')(); // Manually load updater 2 module paths (all modules)
  require('discord_overlay2/standalone_host.js'); // Start overlay
} else {
  require('./bootstrap')(); // Start bootstrap
}