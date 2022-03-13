const { app, BrowserWindow } = require('electron');
const { readFileSync } = require('fs');
const { join } = require('path');

const Constants = require('./Constants');

process.env.PULSE_LATENCY_MSEC = process.env.PULSE_LATENCY_MSEC ?? 30;
app.setAppUserModelId(Constants.APP_ID);
app.name = 'discord'; // Force name as sometimes breaks

const paths = require('./paths');
global.moduleDataPath = paths.getModuleDataPath(); // Global because discord
app.setPath('userData', paths.getUserData()); // Set userData properly because electron

const buildInfo = require('./utils/buildInfo');
app.setVersion(buildInfo.version); // More global because discord / electron
global.releaseChannel = buildInfo.releaseChannel;

log('BuildInfo', 'Loaded build info', buildInfo);

const errorHandler = require('./errorHandler');
errorHandler.init();

const splashScreen = require('./splash');
const appSettings = require('./appSettings');

const updater = require('./updater/updater');
const moduleUpdater = require('./updater/moduleUpdater');
const appUpdater = require('./updater/appUpdater');

const settings = appSettings.getSettings();
if (!settings.get('enableHardwareAcceleration', true)) app.disableHardwareAcceleration();

let desktopCore;
const startCore = () => {
  desktopCore = require('discord_desktop_core');
  log('Bootstrap', 'Required core');

  desktopCore.startup({
    paths,
    splashScreen,
    moduleUpdater,
    buildInfo,
    appSettings,
    Constants,
    updater,
    GPUSettings: require('./GPUSettings'),
    autoStart: require('./autoStart'),
    crashReporterSetup: require('./crashReporterSetup'),
  });

  const i = setImmediate(() => {
    if (!global.mainWindowId) return;
    clearInterval(i);

    const bw = BrowserWindow.fromId(global.mainWindowId);

    let donePageReady = false;
    bw.webContents.on('dom-ready', () => {
      if (!donePageReady) { // Only run once
        splashScreen.pageReady(); // Override Core's pageReady with our own on dom-ready to show main window earlier

        donePageReady = true;
      }

      const [ channel, hash ] = oaVersion.split('-'); // Split via -

      bw.webContents.executeJavaScript(
        readFileSync(join(__dirname, 'mainWindowInject.js'), 'utf8')
          .replaceAll('<channel>', channel)
          .replaceAll('<hash>', hash || 'custom')
      );
    });
  });
};

const startUpdate = async () => {
  const startMinimized = process.argv.includes('--start-minimized');

  paths.cleanOldVersions();

  appUpdater.update(startMinimized, () => {
    if (process.env.OPENASAR_NOSTART) return;

    startCore();
  }, () => {
    log('Bootstrap', 'Main window visible');
    desktopCore.setMainWindowVisible(!startMinimized);

    setTimeout(() => { // Try to update our asar
      const config = require('./config');
      if (oaConfig.setup !== true || process.argv.includes('--config')) config.open();

      if (oaConfig.autoupdate !== false) { // If autoupdate disabled, don't update
        try {
          require('./asarUpdate')();
        } catch (e) {
          log('AsarUpdate', 'Failed', e);
        }
      }
    }, 3000);
  });
};


module.exports = () => {
  if (!app.requestSingleInstanceLock() && !(process.argv.includes('--multi-instance') || oaConfig.multiInstance === true)) {
    log('Bootstrap', 'Non-first instance');
    return app.quit();
  }

  if (app.isReady()) {
    startUpdate();
  } else {
    app.once('ready', startUpdate);
  }
};