const { join } = require('path');
const { app } = require('electron');

global.log = (area, ...args) => console.log(`[\x1b[38;2;88;101;242mOpenAsar\x1b[0m > ${area}]`, ...args); // Make log global for easy usage everywhere

global.oaVersion = 'nightly';

log('Init', 'OpenAsar', oaVersion);
log('Versions', `Electron ${process.versions.electron} | Node ${process.version} ${process.arch}`);

if (process.resourcesPath.startsWith('/usr/lib/electron')) global.systemElectron = true; // Using system electron, flag for other places
process.resourcesPath = join(__dirname, '..'); // Force resourcesPath for system electron

global.buildInfo = JSON.parse(require('fs').readFileSync(join(process.resourcesPath, 'build_info.json'), 'utf8'));
global.releaseChannel = buildInfo.releaseChannel;
app.setVersion(buildInfo.version);
log('BuildInfo', buildInfo);

global.userData = join(app.getPath('appData'), 'discord' + (releaseChannel === 'stable' ? '' : releaseChannel));
global.moduleDataPath = join(userData, 'module_data'); // used by modules
app.setPath('userData', userData);

global.settings = require('./appSettings').getSettings();
global.oaConfig = settings.get('openasar', {});

require('./cmdSwitches')();


if (process.argv.includes('--overlay-host')) require('./updater').requireNative('discord_overlay2', 'standalone_host.js'); // Start overlay
  else require('./bootstrap')(); // Start bootstrap