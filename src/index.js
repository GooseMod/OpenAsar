const log = require('./utils/log');
global.log = log; // Make log global for easy usage everywhere
global.oaVersion = 'nightly';

log('Init', 'OpenAsar v' + oaVersion);

const appSettings = require('./appSettings');
global.oaConfig = appSettings.getSettings().get('openasar', {});

log('Init', 'Loaded config', oaConfig);

require('./cmdSwitches')();

const appMode = process.argv?.includes('--overlay-host') ? 'overlay-host' : 'app';

if (appMode === 'overlay-host') {
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