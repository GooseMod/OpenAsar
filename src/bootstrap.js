const { app, session } = require('electron');
const { readFileSync } = require('fs');
const { join } = require('path');

if (!settings.get('enableHardwareAcceleration', true)) app.disableHardwareAcceleration();
process.env.PULSE_LATENCY_MSEC = process.env.PULSE_LATENCY_MSEC ?? 30;

const buildInfo = require('./utils/buildInfo');
app.setVersion(buildInfo.version); // More global because discord / electron
global.releaseChannel = buildInfo.releaseChannel;

log('BuildInfo', buildInfo);

const Constants = require('./Constants');
app.setAppUserModelId(Constants.APP_ID);
app.name = 'discord'; // Force name as sometimes breaks

process.on('uncaughtException', console.error);


const splash = require('./splash');
const updater = require('./updater');
const autoStart = require('./autoStart');

let desktopCore;
const startCore = () => {
  if (oaConfig.js) session.defaultSession.webRequest.onHeadersReceived((d, cb) => {
    delete d.responseHeaders['content-security-policy'];
    cb(d);
  });

  app.on('browser-window-created', (e, bw) => { // Main window injection
    bw.webContents.on('dom-ready', () => {
      if (!bw.resizable) return; // Main window only
      splash.pageReady(); // Override Core's pageReady with our own on dom-ready to show main window earlier

      const [ , hash ] = oaVersion.split('-'); // Split via -

      bw.webContents.executeJavaScript(readFileSync(join(__dirname, 'mainWindow.js'), 'utf8')
        .replaceAll('<hash>', hash || 'custom')
        .replaceAll('<notrack>', oaConfig.noTrack));

      if (oaConfig.js) bw.webContents.executeJavaScript(oaConfig.js);
    });
  });

  desktopCore = require('./utils/requireNative')('discord_desktop_core');

  desktopCore.startup({
    splashScreen: splash,
    buildInfo,
    Constants,
    updater,
    autoStart,

    // Just requires
    appSettings: require('./appSettings'),
    paths: require('./paths'),

    // Stubs
    GPUSettings: {
      replace: () => {}
    },
    crashReporterSetup: {
      isInitialized: () => true,
      metadata: {}
    }
  });
};

const startUpdate = () => {
  if (oaConfig.noTrack !== false) session.defaultSession.webRequest.onBeforeRequest({ urls: [ 'https://*/api/v9/science' ] }, async (e, cb) => cb({ cancel: true }));

  const startMin = process.argv?.includes?.('--start-minimized');

  const inst = updater.getUpdater();
  inst.on('host-updated', () => autoStart.update(() => {}));
  if (process.platform === 'win32') require('./winFirst')(inst);

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
      if (oaConfig.setup !== true) config.open();
    }, 3000);
  });

  splash.initSplash(startMin);
};


module.exports = () => {
  app.on('second-instance', (e, a) => {
    desktopCore?.handleOpenUrl?.(a.includes('--url') && a[a.indexOf('--') + 1]); // Change url of main window if protocol is used (uses like "discord --url -- discord://example")
  });

  if (!app.requestSingleInstanceLock() && !(process.argv?.includes?.('--multi-instance') || oaConfig.multiInstance === true)) return app.quit();

  if (app.isReady()) startUpdate();
    else app.once('ready', startUpdate);
};