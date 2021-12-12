const log = require('./utils/log');
global.log = log; // Make log global for easy usage everywhere
global.oaVersion = 'nightly';

log('Init', 'OpenAsar v' + oaVersion);

const appSettings = require('./appSettings');
global.oaConfig = appSettings.getSettings().get('openasar', {});

log('Init', 'Loaded config', oaConfig);

const appMode = process.argv?.includes('--overlay-host') ? 'overlay-host' : 'app';

if (appMode === 'overlay-host') {
  const buildInfo = require('./utils/buildInfo');

  if (buildInfo.newUpdater) {
    const updater = require('./updater/updater');

    const {
      NEW_UPDATE_ENDPOINT
    } = require('./Constants');

    if (!updater.tryInitUpdater(buildInfo, NEW_UPDATE_ENDPOINT)) {
      throw new Error('Failed to initialize modules in overlay host.');
    }

    updater.getUpdater().startCurrentVersionSync({
      allowObsoleteHost: true
    });
    // require('./utils/u2LoadModulePath')('discord_overlay2');
  } else {
    require('./updater/moduleUpdater').initPathsOnly(buildInfo);
  }

  require('./utils/requireNative')('discord_overlay2/standalone_host.js')
} else {
  const bootstrap = require('./bootstrap');

  bootstrap(); // Start bootstrap
}