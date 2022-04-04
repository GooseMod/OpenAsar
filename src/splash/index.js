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
let restartRequired = false;
let splashWindow, updateTimeout, newUpdater;


exports.initSplash = (startMinimized = false) => {
  newUpdater = updater.getUpdater();

  if (newUpdater == null) initModuleUpdater();

  launchSplashWindow(startMinimized);

  if (newUpdater != null) {
    updateUntilCurrent();
  } else {
    moduleUpdater.installPendingUpdates();
  }

  if (process.env.OPENASAR_QUICKSTART || oaConfig.quickstart) setTimeout(() => {
    destroySplash();

    if (newUpdater != null) require('../utils/u2QuickLoad'); // Manually load module paths for faster requiring

    launchMainWindow();
    
    setTimeout(() => {
      events.emit('APP_SHOULD_SHOW');
    }, 100);
  }, 300);
};

exports.focusWindow = () => splashWindow?.focus?.();
exports.pageReady = () => destroySplash() || process.nextTick(() => events.emit('APP_SHOULD_SHOW'));

const destroySplash = () => {
  log('Splash', 'Destroy');

  v1_timeoutStop();
  if (!splashWindow) return;

  splashWindow.setSkipTaskbar(true);
  setTimeout(() => {
    if (!splashWindow) return;

    splashWindow.hide();
    splashWindow.close();
    splashWindow = null;
  }, 100);
};

const launchMainWindow = () => {
  for (const e in modulesListeners) moduleUpdater.events.removeListener(e, modulesListeners[e]); // Remove updater v1 listeners

  if (!launchedMainWindow && splashWindow != null) {
    sendState('starting');

    launchedMainWindow = true;
    events.emit('APP_SHOULD_LAUNCH');
  }
};

const sendState = (status) => {
  try {
    splashWindow.webContents.send('state', { status, ...splashState });
  } catch (_e) {}
};


const launchSplashWindow = (startMinimized) => {
  splashWindow = new BrowserWindow({
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

  const win = splashWindow;
  const wc = win.webContents;

  if (process.platform !== 'darwin') win.on('closed', () => !launchedMainWindow && app.quit());

  wc.once('dom-ready', () => {
    if (oaConfig.themeSync !== false) wc.insertCSS(JSON.parse(fs.readFileSync(join(paths.getUserData(), 'userDataCache.json'), 'utf8')).openasarSplashCSS);

    if (oaConfig.splashText === true) {
      const buildInfo = require('../utils/buildInfo.js');
      wc.executeJavaScript(`debug.textContent = '${buildInfo.releaseChannel} ${buildInfo.version}\\nOpenAsar ${oaVersion}'`);
    }
  });
  if (!startMinimized) win.once('ready-to-show', () => win.show());

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

        return launchMainWindow();
      }
    } catch (e) {
      log('Splash', e);
      sendState('fail');

      await new Promise(res => scheduleNextUpdate(res));
    }
  }
};

const initModuleUpdater = () => { // "Old" (not v2 / new, win32 only)
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

  add(CHECKING_FOR_UPDATES, () => {
    v1_timeoutStart();
    sendState(CHECKING_FOR_UPDATES);
  });

  add('update-check-finished', ({ succeeded, updateCount }) => {
    v1_timeoutStop();

    installs.reset();
    downloads.reset();

    if (!succeeded) {
      handleFail();
    } else if (updateCount === 0) {
      launchMainWindow();
    }
  });

  add('downloading-module', ({ name }) => {
    v1_timeoutStop();

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
  add('no-pending-updates', callbackCheck);


  add('downloading-module-progress', ({ name, recv, total }) => {
    downloads.record(name, '', recv, total);
  });

  add('installing-module-progress', ({ name, entries, total }) => {
    installs.record(name, '', entries, total);
  });

  add('update-manually', (e) => {
    splashState.newVersion = e.newVersion;
    sendState('update-manually');
  });
};

const v1_timeoutStart = () => !updateTimeout && (updateTimeout = setTimeout(scheduleNextUpdate, 10000));
const v1_timeoutStop = () => updateTimeout && (updateTimeout = clearTimeout(updateTimeout));

const scheduleNextUpdate = (callback = moduleUpdater.checkForUpdates) => { // Used by v1 and v2, default to v1 as used more widely in it
  updateAttempt++;

  const wait = Math.min(updateAttempt * 10, 60);
  splashState.seconds = wait;
  setTimeout(callback, wait * 1000);
};