const log = require('./utils/log');
global.log = log; // Make log global for easy usage everywhere
global.oaVersion = 'nightly';

log('Init', 'OpenAsar v' + oaVersion);

log('Init', 'Resources Path:', process.resourcesPath);
if (process.resourcesPath.startsWith('/usr/lib/electron')) { // Using system electron, fix process.resourcesPath
  log('Init', 'Detected System Electron, fixing paths');
  global.systemElectron = true;

  const { join } = require('path');
  process.resourcesPath = join(__dirname, '..');

  log('Init', 'Resources Path:', process.resourcesPath);
}

const appSettings = require('./appSettings');
global.oaConfig = appSettings.getSettings().get('openasar', {});

log('Init', 'Loaded config', oaConfig);

require('./cmdSwitches')();

if (process.argv.includes('--overlay-host')) {
  const buildInfo = require('./utils/buildInfo');

  if (buildInfo.newUpdater) {
    require('./utils/u2LoadModulePath')();
  } else {
    require('./updater/moduleUpdater').initPathsOnly(buildInfo);
  }

  require('./utils/requireNative')('discord_overlay2/standalone_host.js')
} else {
  const bootstrap = require('./bootstrap');

  bootstrap(); // Start bootstrap
}
