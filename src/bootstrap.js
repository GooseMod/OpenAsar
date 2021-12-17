const { app, BrowserWindow } = require('electron');
const { readFileSync } = require('fs');
const { join } = require('path');

log('Bootstrap', 'Forcing Electron props');
app.name = 'discord'; // Force name as sometimes breaks data path even with "discord" name (also fixes kernel?)

const requireNative = require('./utils/requireNative');

const paths = require('./paths');
global.moduleDataPath = paths.getModuleDataPath(); // Global because discord
app.setPath('userData', paths.getUserData()); // Set userData properly because electron

const buildInfo = require('./utils/buildInfo');
app.setVersion(buildInfo.version); // More global because discord / electron
global.releaseChannel = buildInfo.releaseChannel;

log('BuildInfo', 'Loaded build info', buildInfo);

const errorHandler = require('./errorHandler');
errorHandler.init();

// Just required for startup
const appSettings = require('./appSettings');
const GPUSettings = require('./GPUSettings');
const crashReporterSetup = require('./crashReporterSetup');
const splashScreen = require('./splash/splashScreen');
const Constants = require('./Constants');
const autoStart = require('./autoStart');

const updater = require('./updater/updater');
const moduleUpdater = require('./updater/moduleUpdater');
const appUpdater = require('./updater/appUpdater');

const settings = appSettings.getSettings();
if (!settings.get('enableHardwareAcceleration', true)) app.disableHardwareAcceleration();

let desktopCore;
const startCore = () => {
  desktopCore = requireNative('discord_desktop_core');
  log('Bootstrap', 'Required desktop_core:', desktopCore);

  /* const electronPath = require.resolve('electron'); // Patch webapp host version to suffix -openasar
  const originalVersion = require.cache[electronPath].exports.app.getVersion();
  require.cache[electronPath].exports.app.getVersion = function() {
    const inDiscordNative = (new Error()).stack.includes('discord_native');
    if (!inDiscordNative) return originalVersion;

    return originalVersion + '-openasar';
  }; */

  desktopCore.startup({
    paths,
    splashScreen,
    moduleUpdater,
    autoStart,
    buildInfo,
    appSettings,
    Constants,
    GPUSettings,
    updater,
    crashReporterSetup,

    // OpenCore additionals (non-standard)
    securityUtils: require('./utils/securityUtils.js')
  });

  const i = setImmediate(() => {
    log('MainWindowInject', 'Attempting to get main window');

    if (!global.mainWindowId) return;

    log('MainWindowInject', 'Success, adding dom-ready handler');

    clearInterval(i);

    const bw = BrowserWindow.fromId(global.mainWindowId);

    bw.webContents.on('dom-ready', () => {
      log('MainWindowInject', 'dom-ready triggered, injecting JS');

      let injectJs = readFileSync(join(__dirname, 'mainWindowInject.js'), 'utf8');

      const [ version1, version2 ] = oaVersion.split('-'); // Split via -
      injectJs = injectJs.replace('<version_1>', version1[0].toUpperCase() + version1.substring(1).toLowerCase()).replace('<version_2>', version2 || '');

      bw.webContents.executeJavaScript(injectJs);
    });
  });
};

const startUpdate = () => {
  appUpdater.update(false, () => {
    if (process.env.OPENASAR_NOSTART) {
      log('Bootstrap', 'Found nostart variable, halting bootstrap');
      return;
    }

    startCore();
  }, () => {
    log('Bootstrap', 'Setting main window visible');
    desktopCore.setMainWindowVisible(true);

    setTimeout(() => { // Try to update our asar
      if (oaConfig.autoupdate === false) return; // If autoupdate disabled, don't update

      const asarUpdate = require('./asarUpdate');

      try {
        asarUpdate();
      } catch (e) {
        log('AsarUpdate', 'Failed to update', e);
      }
    }, 1000);
  });
};

const hasArgvFlag = (flag) => (process.argv || []).slice(1).includes(flag);

module.exports = () => {
  // Paths logging
  log('Paths', `Init! Returns:
getUserData: ${paths.getUserData()}
getUserDataVersioned: ${paths.getUserDataVersioned()}
getResources: ${paths.getResources()}
getModuleDataPath: ${paths.getModuleDataPath()}
getInstallPath: ${paths.getInstallPath()}`);

  const instanceLock = app.requestSingleInstanceLock();
  const allowMultiInstance = hasArgvFlag('--multi-instance') || oaConfig.multiInstance; // argv flag or config

  console.log(instanceLock, allowMultiInstance);

  if (!instanceLock && !allowMultiInstance) {
    log('Bootstrap', 'Non-first instance, quitting (multi-instance disabled)');
    return app.quit();
  }

  if (app.isReady()) {
    startUpdate();
  } else {
    app.once('ready', startUpdate);
  }
};