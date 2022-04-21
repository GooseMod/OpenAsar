const { app, session, dialog } = require('electron');
const { readFileSync } = require('fs');
const get = require('request');
const { join } = require('path');

const Constants = require('./Constants');

process.env.PULSE_LATENCY_MSEC = process.env.PULSE_LATENCY_MSEC ?? 30;
app.setAppUserModelId(Constants.APP_ID);
app.name = 'discord'; // Force name as sometimes breaks

const buildInfo = require('./utils/buildInfo');
app.setVersion(buildInfo.version); // More global because discord / electron
global.releaseChannel = buildInfo.releaseChannel;

log('BuildInfo', buildInfo);

const fatal = e => {
  log('Fatal', e);

  dialog.showMessageBox({
    type: 'error',
    message: 'A fatal Javascript error occured',
    detail: e?.stack ?? String(e)
  }).then(() => app.quit());
};
process.on('uncaughtException', console.error);


const splash = require('./splash');

const updater = require('./updater/updater');
const moduleUpdater = require('./updater/moduleUpdater');

if (!settings.get('enableHardwareAcceleration', true)) app.disableHardwareAcceleration();

const autoStart = require('./autoStart');

let desktopCore;
const startCore = () => {
  if (oaConfig.js) session.defaultSession.webRequest.onHeadersReceived((d, cb) => {
    delete d.responseHeaders['content-security-policy'];
    cb(d);
  });

  app.on('browser-window-created', (e, bw) => { // Main window injection
    bw.webContents.on('dom-ready', () => {
      splash.pageReady(); // Override Core's pageReady with our own on dom-ready to show main window earlier

      const [ channel, hash ] = oaVersion.split('-'); // Split via -

      const exec = bw.webContents.executeJavaScript;
      exec(readFileSync(join(__dirname, 'mainWindow.js'), 'utf8')
        .replaceAll('<channel>', channel)
        .replaceAll('<hash>', hash || 'custom'));

      if (oaConfig.js) exec(oaConfig.js);
    });
  });

  desktopCore = require('./utils/requireNative')('discord_desktop_core');

  desktopCore.startup({
    splashScreen: splash,
    moduleUpdater,
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

const startUpdate = async () => {
  if (oaConfig.noTrack !== false) {
    const bl = { cancel: true }; // Standard block callback response

    let sentry;
    session.defaultSession.webRequest.onBeforeRequest({
      urls: [
        'https://*.discord.com/assets/*.js',
        'https://*/api/*/science'
      ]
    }, async ({ url }, cb) => {
      if (url.endsWith('/science')) return cb(bl);

      if (!sentry && (await new Promise((res) => get(url, (e, r, b) => res(b)))).includes('RecipeWebview')) sentry = url;
      if (sentry === url) return cb(bl);

      cb({});
    });
  }

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
