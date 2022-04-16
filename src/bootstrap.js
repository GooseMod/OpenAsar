const { app } = require('electron');
const { readFileSync } = require('fs');
const { join } = require('path');

const Constants = require('./Constants');

process.env.PULSE_LATENCY_MSEC = process.env.PULSE_LATENCY_MSEC ?? 30;
app.setAppUserModelId(Constants.APP_ID);
app.name = 'discord'; // Force name as sometimes breaks

const buildInfo = require('./utils/buildInfo');
app.setVersion(buildInfo.version); // More global because discord / electron
global.releaseChannel = buildInfo.releaseChannel;

log('BuildInfo', buildInfo);

const { fatal } = require('./errorHandler');
// process.on('uncaughtException', fatal);

const splash = require('./splash');

const updater = require('./updater/updater');
const moduleUpdater = require('./updater/moduleUpdater');

if (!settings.get('enableHardwareAcceleration', true)) app.disableHardwareAcceleration();

const autoStart = require('./autoStart');

let desktopCore;
const startCore = () => {
  app.on('browser-window-created', (e, bw) => { // Main window injection
    bw.webContents.on('dom-ready', () => {
      splash.pageReady(); // Override Core's pageReady with our own on dom-ready to show main window earlier

      const [ channel, hash ] = oaVersion.split('-'); // Split via -

      bw.webContents.executeJavaScript(
        readFileSync(join(__dirname, 'mainWindow.js'), 'utf8')
          .replaceAll('<channel>', channel)
          .replaceAll('<hash>', hash || 'custom')
      );
    });
  });

  desktopCore = require('./utils/requireNative')('discord_desktop_core');

  desktopCore.startup({
    splashScreen: splash,
    moduleUpdater,
    buildInfo,
    Constants,
    updater,
    appSettings: require('./appSettings'),
    paths: require('./paths'),
    GPUSettings: require('./GPUSettings'),
    autoStart,
    crashReporterSetup: require('./crashReporterSetup'),
  });
};

const startUpdate = async () => {
  if (oaConfig.noTrack !== false) require('./noTrack');

  const startMin = process.argv.includes('--start-minimized');

  if (updater.tryInitUpdater(buildInfo, Constants.NEW_UPDATE_ENDPOINT)) {
    const inst = updater.getUpdater();

    inst.on('host-updated', () => autoStart.update(() => {}));
    inst.on('unhandled-exception', fatal);
    inst.on('InconsistentInstallerState', fatal);
    inst.on('update-error', console.error);

    require('./firstRun').do(inst);
  } else {
    moduleUpdater.init(Constants.UPDATE_ENDPOINT, buildInfo);
  }

  splash.events.once('APP_SHOULD_LAUNCH', () => {
    if (!process.env.OPENASAR_NOSTART) startCore();
  });

  let done;
  splash.events.once('APP_SHOULD_SHOW', () => {
    if (done) return;
    done = true;

    desktopCore.setMainWindowVisible(!startMin);

    setTimeout(() => { // Try to update our asar
      const config = require('./config');
      if (oaConfig.setup !== true || process.argv.includes('--config')) config.open();

      if (oaConfig.autoupdate !== false) { // If autoupdate disabled, don't update
        try {
          require('./asarUpdate')();
        } catch (e) {
          log('AsarUpdate', e);
        }
      }
    }, 3000);
  });

  splash.initSplash(startMin);
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
