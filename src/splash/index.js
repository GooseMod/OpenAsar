const { join } = require('path');
const fs = require('fs');
const _events = require('events');
const { BrowserWindow, app } = require('electron');

const paths = require('../paths');
const moduleUpdater = require("../updater/moduleUpdater");
const updater = require("../updater/updater");

let splashState = {};
let modulesListeners = {};
let launchedMainWindow = false;
let updateAttempt = 0;
let restartRequired = false;
let splashWindow;
let updateTimeout;
let newUpdater;


exports.initSplash = (startMinimized = false) => {
  log('Splash', `Initing`);

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

    if (newUpdater != null) { // Manually load desktop_core module path for faster requiring
      require('../utils/u2LoadModulePath')();
    }

    launchMainWindow();
    
    setTimeout(() => {
      events.emit(APP_SHOULD_SHOW);
    }, 100);
  }, 300);
};

exports.focusWindow = () => splashWindow?.focus?.();
exports.pageReady = () => destroySplash() || process.nextTick(() => events.emit(APP_SHOULD_SHOW));

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
  log('Splash', 'Launch main');

  for (const e in modulesListeners) moduleUpdater.events.removeListener(e, modulesListeners[e]); // Remove updater v1 listeners

  if (!launchedMainWindow && splashWindow != null) {
    launchedMainWindow = true;
    events.emit(APP_SHOULD_LAUNCH);
  }
};

const sendState = (status) => splashWindow && splashWindow.webContents.send('SPLASH_STATE', { status, ...splashState });


const launchSplashWindow = (startMinimized) => {
  splashWindow = new BrowserWindow({
    width: 300,
    height: process.platform === 'darwin' ? 300 : 350,
    transparent: false,
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

  if (process.platform !== 'darwin') win.on('closed', () => { if (!launchedMainWindow) app.quit(); });

  wc.once('dom-ready', () => {
    if (oaConfig.themeSync !== false) try { // Inject themesync CSS
      wc.insertCSS(JSON.parse(fs.readFileSync(join(paths.getUserData(), 'userDataCache.json'), 'utf8')).openasarSplashCSS);
    } catch (e) { }

    if (oaConfig.splashText === true) try {
      const buildInfo = require('../utils/buildInfo.js');
      wc.executeJavaScript(`debug.textContent = '${buildInfo.releaseChannel} ${buildInfo.version}\\nOpenAsar ${oaVersion}'`);
    } catch (e) { }
  });
  if (!startMinimized) win.once('ready-to-show', () => win.show());

  win.loadURL('file:///' + join(__dirname, 'index.html'));
};


const CHECKING_FOR_UPDATES = 'checking-for-updates';
const UPDATE_CHECK_FINISHED = 'update-check-finished';
const UPDATE_FAILURE = 'update-failure';
const LAUNCHING = 'launching';
const DOWNLOADING_MODULE = 'downloading-module';
const DOWNLOADING_UPDATES = 'downloading-updates';
const DOWNLOADING_MODULES_FINISHED = 'downloading-modules-finished';
const DOWNLOADING_MODULE_PROGRESS = 'downloading-module-progress';
const DOWNLOADED_MODULE = 'downloaded-module';
const NO_PENDING_UPDATES = 'no-pending-updates';
const INSTALLING_MODULE = 'installing-module';
const INSTALLING_UPDATES = 'installing-updates';
const INSTALLED_MODULE = 'installed-module';
const INSTALLING_MODULE_PROGRESS = 'installing-module-progress';
const INSTALLING_MODULES_FINISHED = 'installing-modules-finished';
const UPDATE_MANUALLY = 'update-manually';
const APP_SHOULD_LAUNCH = 'APP_SHOULD_LAUNCH';
const APP_SHOULD_SHOW = 'APP_SHOULD_SHOW';
const events = new _events.EventEmitter();

exports.APP_SHOULD_LAUNCH = APP_SHOULD_LAUNCH;
exports.APP_SHOULD_SHOW = APP_SHOULD_SHOW;
exports.events = events;

class UIProgress { // Generic class to track updating and sent states to splash
  constructor() {
    Object.assign(this, {
      progress: new Map(),
      done: new Set(),
      total: new Set()
    });
  }

  record(id, state, percent) {
    this.total.add(id);

    if (state !== updater.TASK_STATE_WAITING) {
      this.progress.set(id, percent);

      if (state === updater.TASK_STATE_COMPLETE) this.done.add(id);
    }
  }

  sendState(id) {
    if (this.progress.size > 0 && this.progress.size > this.done.size) {
      splashState = {
        current: this.done.size + 1,
        total: this.total.size,
        progress: [...this.progress.values()].reduce((a, x) => a + x, 0) / this.total.size
      };

      sendState(id);

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
      const downloads = new UIProgress();
      const installs = new UIProgress();

      await newUpdater.updateToLatestWithOptions(retryOptions, ({ task, state, percent }) => {
        const download = task.HostDownload || task.ModuleDownload;
        const install = task.HostInstall || task.ModuleInstall;

        installedAnything = true;

        if (download != null) downloads.record(download.package_sha256, state, percent);

        if (!downloads.sendState(DOWNLOADING_UPDATES)) installs.sendState(INSTALLING_UPDATES);

        if (install == null) return;
        
        installs.record(install.package_sha256, state, percent);

        if (task.HostInstall != null) {
          retryOptions.skip_host_delta = true;
        } else if (task.ModuleInstall != null) {
          retryOptions.skip_module_delta[install.version.module.name] = true;
        }
      });

      if (!installedAnything) {
        sendState(LAUNCHING);

        await newUpdater.startCurrentVersion();
        newUpdater.setRunningInBackground();
        newUpdater.collectGarbage();

        return launchMainWindow();
      }
    } catch (e) {
      log('Splash', 'Update failed', e);
      await new Promise(res => {
        scheduleNextUpdate(res);
        sendState(UPDATE_FAILURE);
      });
    }
  }
}

const initModuleUpdater = () => { // "Old" (not v2 / new, win32 only)
  const add = (event, listener) => {
    modulesListeners[event] = listener;
    moduleUpdater.events.addListener(event, listener);
  };

  const addBasic = (ev, key, ui = ev) => add(ev, (e) => {
    splashState[key] = e[key];
    sendState(ui);
  });
  
  const callbackCheck = () => moduleUpdater.checkForUpdates();

  const callbackProgress = (e) => {
    delete splashState.progress;
    if (e.name === 'host') restartRequired = true;
  };

  const handleFail = () => {
    scheduleNextUpdate();
    sendState(UPDATE_FAILURE);
  };

  add(CHECKING_FOR_UPDATES, () => {
    v1_timeoutStart();
    sendState(CHECKING_FOR_UPDATES);
  });

  add(UPDATE_CHECK_FINISHED, ({ succeeded, updateCount }) => {
    v1_timeoutStop();

    if (!succeeded) {
      handleFail();
    } else if (updateCount === 0) {
      moduleUpdater.setInBackground();
      launchMainWindow();
      sendState(LAUNCHING);
    }
  });

  add(DOWNLOADING_MODULE, ({ current, total }) => {
    v1_timeoutStop();

    splashState = { current, total };
    sendState(DOWNLOADING_UPDATES);
  });

  add(DOWNLOADING_MODULES_FINISHED, ({ failed }) => {
    if (failed > 0) {
      handleFail();
    } else {
      process.nextTick(() => {
        if (restartRequired) {
          moduleUpdater.quitAndInstallUpdates();
        } else {
          moduleUpdater.installPendingUpdates();
        }
      });
    }
  });
  
  add(INSTALLING_MODULE, ({ current, total }) => {
    splashState = { current, total };
    sendState(INSTALLING_UPDATES);
  });

  add(DOWNLOADED_MODULE, callbackProgress);
  add(INSTALLED_MODULE, callbackProgress);

  add(INSTALLING_MODULES_FINISHED, callbackCheck);
  add(NO_PENDING_UPDATES, callbackCheck);

  addBasic(DOWNLOADING_MODULE_PROGRESS, 'progress', DOWNLOADING_UPDATES);
  addBasic(INSTALLING_MODULE_PROGRESS, 'progress', INSTALLING_UPDATES);
  addBasic(UPDATE_MANUALLY, 'newVersion');
};

const v1_timeoutStart = () => !updateTimeout && (updateTimeout = setTimeout(scheduleNextUpdate, 10000));
const v1_timeoutStop = () => updateTimeout && (updateTimeout = clearTimeout(updateTimeout));

const scheduleNextUpdate = (callback = moduleUpdater.checkForUpdates) => { // Used by v1 and v2, default to v1 as used more widely in it
  updateAttempt++;

  const wait = Math.min(updateAttempt * 10, 60);
  splashState.seconds = wait;
  setTimeout(callback, wait * 1000);
};