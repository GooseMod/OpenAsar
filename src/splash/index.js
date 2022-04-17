const { join } = require('path');
const fs = require('fs');
const { BrowserWindow, app } = require('electron');

const paths = require('../paths');
const moduleUpdater = require("../updater/moduleUpdater");
const updater = require("../updater/updater");

let splashState = {};
let modulesListeners = {};
let launchedMainWindow = false;
let updateAttempt = 0;
let win, newUpdater;


exports.initSplash = (startMin = false) => {
  newUpdater = updater.getUpdater();

  if (newUpdater == null) initModuleUpdater();

  launchSplash(startMin);

  if (newUpdater != null) updateUntilCurrent();

  if (process.env.OPENASAR_QUICKSTART || oaConfig.quickstart) setTimeout(() => {
    destroySplash();

    launchMain();
    
    setTimeout(() => {
      events.emit('APP_SHOULD_SHOW');
    }, 100);
  }, 300);
};

exports.focusWindow = () => win?.focus?.();
exports.pageReady = () => destroySplash() || process.nextTick(() => events.emit('APP_SHOULD_SHOW'));

const destroySplash = () => {
  win?.setSkipTaskbar?.(true);

  setTimeout(() => {
    if (!win) return;

    win.hide();
    win.close();
    win = null;
  }, 100);
};

const launchMain = () => {
  for (const e in modulesListeners) moduleUpdater.events.removeListener(e, modulesListeners[e]); // Remove updater v1 listeners

  if (!launchedMainWindow && win != null) {
    sendState('starting');

    launchedMainWindow = true;
    events.emit('APP_SHOULD_LAUNCH');
  }
};

const sendState = (status) => {
  try {
    win.webContents.send('state', { status, ...splashState });
  } catch (_e) {}
};


const launchSplash = (startMin) => {
  win = new BrowserWindow({
    width: 300,
    height: process.platform === 'darwin' ? 300 : 350,
    frame: false,
    resizable: false,
    center: true,
    show: false,
    backgroundColor: '#2f3136',
    webPreferences: {
      preload: join(__dirname, 'preload.js')
    }
  });

  const wc = win.webContents;

  if (process.platform !== 'darwin') win.on('closed', () => !launchedMainWindow && app.quit());

  wc.once('dom-ready', () => {
    if (oaConfig.themeSync !== false) wc.insertCSS(JSON.parse(fs.readFileSync(join(paths.getUserData(), 'userDataCache.json'), 'utf8')).openasarSplashCSS);

    if (oaConfig.splashText === true) {
      const buildInfo = require('../utils/buildInfo.js');
      wc.executeJavaScript(`debug.textContent = '${buildInfo.releaseChannel} ${buildInfo.version}\\nOpenAsar ${oaVersion}'`);
    }
  });

  if (!startMin) win.once('ready-to-show', () => win.show());

  win.loadURL('https://cdn.openasar.dev/splash');
};


const CHECKING_FOR_UPDATES = 'checking-for-updates';

const events = exports.events = new (require('events').EventEmitter)();

let progressState = 'downloading';
class UIProgress { // Generic class to track updating and sent states to splash
  constructor(st) {
    this.stateId = st ? 'installing' : 'downloading';

    this.reset();
  }

  reset() {
    Object.assign(this, {
      progress: new Map(),
      done: new Set(),
      total: new Set()
    });
  }

  record(id, state, current, outOf) {
    this.total.add(id);

    if (current) this.progress.set(id, [ current, outOf ?? 100 ]);
    if (state === 'Complete') this.done.add(id);

    this.send();
  }

  send() {
    if ((newUpdater && this.progress.size > 0 && this.progress.size > this.done.size) || (!newUpdater && progressState === this.stateId)) {
      const progress = [...this.progress.values()].reduce((a, x) => a + x[0], 0) / [...this.progress.values()].reduce((a, x) => a + x[1], 0) * 100;
      if (progress > 100) return true;

      splashState = {
        current: this.done.size + 1,
        total: this.total.size,
        progress
      };

      sendState(this.stateId);

      return true;
    }
  }
}

const updateUntilCurrent = async () => {
  const retryOptions = {
    skip_host_delta: false,
    skip_module_delta: {}
  };

  while (true) {
    sendState(CHECKING_FOR_UPDATES);

    try {
      let installedAnything = false;
      const downloads = new UIProgress(0);
      const installs = new UIProgress(1);

      await newUpdater.updateToLatestWithOptions(retryOptions, ({ task, state, percent }) => {
        const download = task.HostDownload || task.ModuleDownload;
        const install = task.HostInstall || task.ModuleInstall;

        installedAnything = true;

        const simpleRecord = (tracker, x) => tracker.record(x.package_sha256, state, percent);

        if (download != null) simpleRecord(downloads, download);

        if (!downloads.send()) installs.send();

        if (install == null) return;
        simpleRecord(installs, install);

        if (task.HostInstall != null) {
          retryOptions.skip_host_delta = true;
        } else if (task.ModuleInstall != null) {
          retryOptions.skip_module_delta[install.version.module.name] = true;
        }
      });

      if (!installedAnything) {
        await newUpdater.startCurrentVersion();
        newUpdater.collectGarbage();

        return launchMain();
      }
    } catch (e) {
      log('Splash', e);
      sendState('fail');

      await new Promise(res => scheduleNextUpdate(res));
    }
  }
};

const initModuleUpdater = () => { // "Old" (not v2 / new, win32 only)
  let restartRequired;

  const add = (event, listener) => {
    modulesListeners[event] = listener;
    moduleUpdater.events.on(event, listener);
  };

  const callbackCheck = () => moduleUpdater.checkForUpdates();

  const downloads = new UIProgress(0), installs = new UIProgress(1);

  const handleFail = () => {
    scheduleNextUpdate();
    sendState('fail');
  };

  add('update-check-finished', ({ succeeded, updateCount }) => {
    installs.reset();
    downloads.reset();

    if (!succeeded) {
      handleFail();
    } else if (updateCount === 0) {
      launchMain();
    }
  });

  add('downloading-module', ({ name }) => {
    downloads.record(name, 'Waiting');
    installs.record(name, 'Waiting');
  });

  add('downloading-modules-finished', ({ failed }) => {
    progressState = 'installing';
    if (failed > 0) handleFail();
      else if (restartRequired) moduleUpdater.quitAndInstallUpdates();
  });
  
  add('installing-module', ({ name }) => {
    installs.record(name, 'Waiting');
  });

  const segmentCallback = (tracker) => (({ name }) => {
    tracker.record(name, 'Complete');
    if (name === 'host') restartRequired = true;
  });

  add('downloaded-module', segmentCallback(downloads));
  add('installed-module', segmentCallback(installs));

  add('installing-modules-finished', callbackCheck);

  const progressCallback = (tracker) => ({ name, cur, total }) => tracker.record(name, '', cur, total);

  add('downloading-module-progress', progressCallback(downloads));
  add('installing-module-progress', progressCallback(installs));


  add('update-manually', e => {
    splashState.newVersion = e.newVersion;
    sendState('update-manually');
  });

  sendState(CHECKING_FOR_UPDATES);

  callbackCheck();
};

const scheduleNextUpdate = (callback = moduleUpdater.checkForUpdates) => { // Used by v1 and v2, default to v1 as used more widely in it
  updateAttempt++;

  const wait = Math.min(updateAttempt * 10, 60);
  splashState.seconds = wait;
  setTimeout(callback, wait * 1000);
};