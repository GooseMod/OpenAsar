"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.initSplash = initSplash;
exports.focusWindow = focusWindow;
exports.pageReady = pageReady;
exports.events = exports.APP_SHOULD_SHOW = exports.APP_SHOULD_LAUNCH = void 0;

var _electron = require("electron");

var _events = require("events");

var _fs = _interopRequireDefault(require("fs"));

var _path = _interopRequireDefault(require("path"));

var _url = _interopRequireDefault(require("url"));

var _Backoff = _interopRequireDefault(require("../utils/Backoff"));

var moduleUpdater = _interopRequireWildcard(require("../updater/moduleUpdater"));

var paths = _interopRequireWildcard(require("../paths"));

var _securityUtils = require("../utils/securityUtils");

var _updater = require("../updater/updater");

var _ipcMain = _interopRequireDefault(require("../ipcMain"));

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const UPDATE_TIMEOUT_WAIT = 10000;
const RETRY_CAP_SECONDS = 60; // citron note: atom seems to add about 50px height to the frame on mac but not windows
// TODO: see if we can eliminate fudge by using useContentSize BrowserWindow option

const LOADING_WINDOW_WIDTH = 300;
const LOADING_WINDOW_HEIGHT = process.platform === 'darwin' ? 300 : 350; // TODO: addModulesListener events should use Module's constants

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
exports.APP_SHOULD_LAUNCH = APP_SHOULD_LAUNCH;
const APP_SHOULD_SHOW = 'APP_SHOULD_SHOW';
exports.APP_SHOULD_SHOW = APP_SHOULD_SHOW;
const events = new _events.EventEmitter();
exports.events = events;

function webContentsSend(win, event, ...args) {
  if (win != null && win.webContents != null) {
    win.webContents.send(`DISCORD_${event}`, ...args);
  }
}

let splashWindow;
let modulesListeners;
let updateTimeout;
let updateAttempt;
let splashState;
let launchedMainWindow;
let quoteCachePath;
let restartRequired = false;
let newUpdater;
const updateBackoff = new _Backoff.default(1000, 30000); // TODO(eiz): some of this logic should probably not live in the splash.
//
// Disabled because Rust interop stuff is going on in here.

/* eslint-disable camelcase */

class TaskProgress {
  constructor() {
    this.inProgress = new Map();
    this.finished = new Set();
    this.allTasks = new Set();
  }

  recordProgress(progress, task) {
    this.allTasks.add(task.package_sha256);

    if (progress.state !== _updater.TASK_STATE_WAITING) {
      this.inProgress.set(task.package_sha256, progress.percent);

      if (progress.state === _updater.TASK_STATE_COMPLETE) {
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
/* eslint-enable camelcase */


function initOldUpdater() {
  modulesListeners = {};
  addModulesListener(CHECKING_FOR_UPDATES, () => {
    startUpdateTimeout();
    updateSplashState(CHECKING_FOR_UPDATES);
  });
  addModulesListener(UPDATE_CHECK_FINISHED, ({
    succeeded,
    updateCount,
    manualRequired
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
    name,
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
    name,
    progress
  }) => {
    splashState.progress = progress;
    updateSplashState(DOWNLOADING_UPDATES);
  });
  addModulesListener(DOWNLOADED_MODULE, ({
    name,
    current,
    total,
    succeeded
  }) => {
    delete splashState.progress;

    if (name === 'host') {
      restartRequired = true;
    }
  });
  addModulesListener(DOWNLOADING_MODULES_FINISHED, ({
    succeeded,
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
    name,
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
    name,
    current,
    total,
    succeeded
  }) => delete splashState.progress);
  addModulesListener(INSTALLING_MODULE_PROGRESS, ({
    name,
    progress
  }) => {
    splashState.progress = progress;
    updateSplashState(INSTALLING_UPDATES);
  });
  addModulesListener(INSTALLING_MODULES_FINISHED, ({
    succeeded,
    failed
  }) => moduleUpdater.checkForUpdates());
  addModulesListener(UPDATE_MANUALLY, ({
    newVersion
  }) => {
    splashState.newVersion = newVersion;
    updateSplashState(UPDATE_MANUALLY);
  });
}

function initSplash(startMinimized = false) {
  splashState = {};
  launchedMainWindow = false;
  updateAttempt = 0;
  newUpdater = (0, _updater.getUpdater)();

  if (newUpdater == null) {
    initOldUpdater();
  }

  launchSplashWindow(startMinimized);
  quoteCachePath = _path.default.join(paths.getUserData(), 'quotes.json');

  _ipcMain.default.on('UPDATED_QUOTES', (_event, quotes) => cacheLatestQuotes(quotes));
}

function destroySplash() {
  stopUpdateTimeout();

  if (splashWindow) {
    splashWindow.setSkipTaskbar(true); // defer the window hiding for a short moment so it gets covered by the main window

    const _nukeWindow = () => {
      if (splashWindow != null) {
        splashWindow.hide();
        splashWindow.close();
        splashWindow = null;
      }
    };

    setTimeout(_nukeWindow, 100);
  }
}

function addModulesListener(event, listener) {
  if (newUpdater != null) return;
  modulesListeners[event] = listener;
  moduleUpdater.events.addListener(event, listener);
}

function removeModulesListeners() {
  if (newUpdater != null) return;

  for (const event of Object.keys(modulesListeners)) {
    moduleUpdater.events.removeListener(event, modulesListeners[event]);
  }
}

function startUpdateTimeout() {
  if (!updateTimeout) {
    updateTimeout = setTimeout(() => scheduleUpdateCheck(), UPDATE_TIMEOUT_WAIT);
  }
}

function stopUpdateTimeout() {
  if (updateTimeout) {
    clearTimeout(updateTimeout);
    updateTimeout = null;
  }
}

function updateSplashState(event) {
  if (splashWindow != null && !splashWindow.isDestroyed() && !splashWindow.webContents.isDestroyed()) {
    webContentsSend(splashWindow, 'SPLASH_UPDATE_STATE', {
      status: event,
      ...splashState
    });
  }
}

function launchSplashWindow(startMinimized) {
  const windowConfig = {
    width: LOADING_WINDOW_WIDTH,
    height: LOADING_WINDOW_HEIGHT,
    transparent: false,
    frame: false,
    resizable: false,
    center: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      enableRemoteModule: false,
      contextIsolation: true,
      preload: _path.default.join(__dirname, 'preload.js')
    }
  };
  splashWindow = new _electron.BrowserWindow(windowConfig); // prevent users from dropping links to navigate in splash window

  splashWindow.webContents.on('will-navigate', e => e.preventDefault());
  splashWindow.webContents.on('new-window', (e, windowURL) => {
    e.preventDefault();
    (0, _securityUtils.saferShellOpenExternal)(windowURL); // exit, but delay half a second because openExternal is about to fire
    // some events to things that are freed by app.quit.

    setTimeout(_electron.app.quit, 500);
  });

  if (process.platform !== 'darwin') {
    // citron note: this causes a crash on quit while the window is open on osx
    splashWindow.on('closed', () => {
      splashWindow = null;

      if (!launchedMainWindow) {
        // user has closed this window before we launched the app, so let's quit
        _electron.app.quit();
      }
    });
  }

  _ipcMain.default.on('SPLASH_SCREEN_READY', () => {
    const cachedQuote = chooseCachedQuote();

    if (cachedQuote) {
      webContentsSend(splashWindow, 'SPLASH_SCREEN_QUOTE', cachedQuote);
    }

    if (splashWindow && !startMinimized) {
      splashWindow.show();
    }

    if (newUpdater != null) {
      updateUntilCurrent();
    } else {
      moduleUpdater.installPendingUpdates();
    }
  });

  _ipcMain.default.on('SPLASH_SCREEN_QUIT', () => {
    _electron.app.quit();
  });

  const splashUrl = _url.default.format({
    protocol: 'file',
    slashes: true,
    pathname: _path.default.join(__dirname, 'index.html')
  });

  splashWindow.loadURL(splashUrl);
}

function launchMainWindow() {
  removeModulesListeners();

  if (!launchedMainWindow && splashWindow != null) {
    launchedMainWindow = true;
    events.emit(APP_SHOULD_LAUNCH);
  }
}

function scheduleUpdateCheck() {
  // TODO: can we use backoff here?
  updateAttempt += 1;
  const retryInSeconds = Math.min(updateAttempt * 10, RETRY_CAP_SECONDS);
  splashState.seconds = retryInSeconds;
  setTimeout(() => moduleUpdater.checkForUpdates(), retryInSeconds * 1000);
}

function focusWindow() {
  if (splashWindow != null) {
    splashWindow.focus();
  }
}

function pageReady() {
  destroySplash();
  process.nextTick(() => events.emit(APP_SHOULD_SHOW));
}

function cacheLatestQuotes(quotes) {
  _fs.default.writeFile(quoteCachePath, JSON.stringify(quotes), e => {
    if (e) {
      console.warn('Failed updating quote cache with error: ', e);
    }
  });
}

function chooseCachedQuote() {
  let cachedQuote = null;

  try {
    const cachedQuotes = JSON.parse(_fs.default.readFileSync(quoteCachePath));
    cachedQuote = cachedQuotes[Math.floor(Math.random() * cachedQuotes.length)];
  } catch (_err) {}

  return cachedQuote;
}