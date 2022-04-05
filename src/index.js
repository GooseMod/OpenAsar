const log = global.log = (area, ...args) => console.log(`[\x1B[38;2;88;101;242mOpenAsar\x1B[0m > ${area}]`, ...args); // Make log global for easy usage everywhere

global.oaVersion = 'nightly';

log('Init', 'OpenAsar', oaVersion);

if (process.resourcesPath.startsWith('/usr/lib/electron')) global.systemElectron = true; // Using system electron, flag for other places
process.resourcesPath = require('path').join(__dirname, '..'); // Force resourcesPath for system electron

require('./paths').init();

global.settings = require('./appSettings').getSettings();
global.oaConfig = settings.get('openasar', {});
require('./cmdSwitches')();

if (process.argv.includes('--overlay-host')) { // If overlay
  require('./utils/u2QuickLoad'); // Manually load Updater v2 module paths (all modules)
  require('./utils/requireNative')('discord_overlay2', 'standalone_host.js'); // Start overlay
} else {
  require('./bootstrap')(); // Start bootstrap
}