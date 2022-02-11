const { join } = require('path');
const fs = require('fs');
const _events = require('events');
const { BrowserWindow, app } = require('electron');

const paths = require('../paths');
const Backoff = require('../utils/Backoff');
const moduleUpdater = require("../updater/moduleUpdater");
const updater = require("../updater/updater");

let splashState = {};
let launchedMainWindow = false;
let updateAttempt = 0;
let restartRequired = false;


exports.initSplash = (startMinimized = false) => {
  log('Splash', `Initing`);

  newUpdater = updater.getUpdater();

  if (newUpdater == null) initOldUpdater();

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

  stopUpdateTimeout();
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

  removeModulesListeners();

  if (!launchedMainWindow && splashWindow != null) {
    launchedMainWindow = true;
    events.emit(APP_SHOULD_LAUNCH);
  }
};

const updateSplashState = (status) => splashWindow && splashWindow.webContents.send('SPLASH_STATE', { status, ...splashState });


const launchSplashWindow = (startMinimized) => {
  const windowConfig = {
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
  };

  splashWindow = new BrowserWindow(windowConfig);
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


const addModulesListener = (event, listener) => {
  if (newUpdater) return;
  modulesListeners[event] = listener;
  moduleUpdater.events.addListener(event, listener);
};

const removeModulesListeners = () => {
  if (newUpdater) return;
  for (const e in modulesListeners) moduleUpdater.events.removeListener(e, modulesListeners[e]);
};

const startUpdateTimeout = () => !updateTimeout && (updateTimeout = setTimeout(() => scheduleUpdateCheck(), 10000));
const stopUpdateTimeout = () => updateTimeout && clearTimeout(updateTimeout) && (updateTimeout = null);

const scheduleUpdateCheck = () => {
  updateAttempt++;

  const wait = Math.min(updateAttempt * 10, 60);
  splashState.seconds = wait;
  setTimeout(() => moduleUpdater.checkForUpdates(), retryInSeconds * 1000);
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

let splashWindow;
let modulesListeners;
let updateTimeout;
let newUpdater;
const updateBackoff = new Backoff(1000, 30000);

class TaskProgress {
  constructor() {
    this.inProgress = new Map();
    this.finished = new Set();
    this.allTasks = new Set();
  }

  recordProgress(progress, task) {
    this.allTasks.add(task.package_sha256);

    if (progress.state !== updater.TASK_STATE_WAITING) {
      this.inProgress.set(task.package_sha256, progress.percent);

      if (progress.state === updater.TASK_STATE_COMPLETE) {
        this.finished.add(task.package_sha256);
      }
    }
  }

  updateSplashState(newState) {
    if (this.inProgress.size > 0 && this.inProgress.size > this.finished.size) {
      let totalPercent = 0;

      for (const item of this.inProgress.values()) {
        totalPercent += item;
      }

      totalPercent /= this.allTasks.size;
      splashState = {
        current: this.finished.size + 1,
        total: this.allTasks.size,
        progress: totalPercent
      };
      updateSplashState(newState);
      return true;
    }

    return false;
  }

}

async function updateUntilCurrent() {
  const retryOptions = {
    skip_host_delta: false,
    skip_module_delta: {}
  };

  while (true) {
    updateSplashState(CHECKING_FOR_UPDATES);

    try {
      let installedAnything = false;
      const downloads = new TaskProgress();
      const installs = new TaskProgress();
      await newUpdater.updateToLatestWithOptions(retryOptions, progress => {
        const task = progress.task;
        const downloadTask = task.HostDownload || task.ModuleDownload;
        const installTask = task.HostInstall || task.ModuleInstall;
        installedAnything = true;

        if (downloadTask != null) {
          downloads.recordProgress(progress, downloadTask);
        }

        if (installTask != null) {
          installs.recordProgress(progress, installTask);

          if (progress.state.Failed != null) {
            if (task.HostInstall != null) {
              retryOptions.skip_host_delta = true;
            } else if (task.ModuleInstall != null) {
              retryOptions.skip_module_delta[installTask.version.module.name] = true;
            }
          }
        }

        if (!downloads.updateSplashState(DOWNLOADING_UPDATES)) {
          installs.updateSplashState(INSTALLING_UPDATES);
        }
      });

      if (!installedAnything) {
        await newUpdater.startCurrentVersion();
        newUpdater.setRunningInBackground();
        newUpdater.collectGarbage();
        launchMainWindow();
        updateBackoff.succeed();
        updateSplashState(LAUNCHING);
        return;
      }
    } catch (e) {
      console.error('Update failed', e);
      await new Promise(resolve => {
        const delayMs = updateBackoff.fail(resolve);
        splashState.seconds = Math.round(delayMs / 1000);
        updateSplashState(UPDATE_FAILURE);
      });
    }
  }
}

function initOldUpdater() {
  modulesListeners = {};
  addModulesListener(CHECKING_FOR_UPDATES, () => {
    startUpdateTimeout();
    updateSplashState(CHECKING_FOR_UPDATES);
  });
  addModulesListener(UPDATE_CHECK_FINISHED, ({
    succeeded,
    updateCount
  }) => {
    stopUpdateTimeout();

    if (!succeeded) {
      scheduleUpdateCheck();
      updateSplashState(UPDATE_FAILURE);
    } else if (updateCount === 0) {
      moduleUpdater.setInBackground();
      launchMainWindow();
      updateSplashState(LAUNCHING);
    }
  });
  addModulesListener(DOWNLOADING_MODULE, ({
    current,
    total
  }) => {
    stopUpdateTimeout();
    splashState = {
      current,
      total
    };
    updateSplashState(DOWNLOADING_UPDATES);
  });
  addModulesListener(DOWNLOADING_MODULE_PROGRESS, ({
    progress
  }) => {
    splashState.progress = progress;
    updateSplashState(DOWNLOADING_UPDATES);
  });
  addModulesListener(DOWNLOADED_MODULE, ({
    name
  }) => {
    delete splashState.progress;

    if (name === 'host') {
      restartRequired = true;
    }
  });
  addModulesListener(DOWNLOADING_MODULES_FINISHED, ({
    failed
  }) => {
    if (failed > 0) {
      scheduleUpdateCheck();
      updateSplashState(UPDATE_FAILURE);
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
  addModulesListener(NO_PENDING_UPDATES, () => moduleUpdater.checkForUpdates());
  addModulesListener(INSTALLING_MODULE, ({
    current,
    total
  }) => {
    splashState = {
      current,
      total
    };
    updateSplashState(INSTALLING_UPDATES);
  });
  addModulesListener(INSTALLED_MODULE, ({
  }) => delete splashState.progress);
  addModulesListener(INSTALLING_MODULE_PROGRESS, ({
    progress
  }) => {
    splashState.progress = progress;
    updateSplashState(INSTALLING_UPDATES);
  });
  addModulesListener(INSTALLING_MODULES_FINISHED, () => moduleUpdater.checkForUpdates());
  addModulesListener(UPDATE_MANUALLY, ({
    newVersion
  }) => {
    splashState.newVersion = newVersion;
    updateSplashState(UPDATE_MANUALLY);
  });
}