const { app, ipcMain } = require('electron');

const moduleUpdater = require("../updater/moduleUpdater");
const updater = require("../updater/updater");

let launched, win;


exports.initSplash = (startMin) => {
  const inst = updater.getUpdater();
  if (inst) initNew(inst);
    else initOld();

  launchSplash(startMin);


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
  moduleUpdater.events.removeAllListeners(); // Remove updater v1 listeners

  if (!launched && win != null) {
    sendState('starting');

    launched = true;
    events.emit('APP_SHOULD_LAUNCH');
  }
};

const sendState = (status, s = {}) => {
  try {
    win.webContents.send('state', { status, ...s });
  } catch { }
};


const launchSplash = (startMin) => {
  win = require('../utils/win')({
    width: 300,
    height: process.platform === 'darwin' ? 300 : 350
  }, 'splash');

  if (process.platform !== 'darwin') win.on('closed', () => !launched && app.quit());

  ipcMain.on('ss', launchMain);
  ipcMain.on('sq', app.quit);

  if (!startMin) win.once('ready-to-show', win.show);
};


const events = exports.events = new (require('events').EventEmitter)();

let toSend = 0; // Progress state to send for ModuleUpdater (0 = downloading, 1 = installing)
class UIProgress { // Generic class to track updating and sent states to splash
  constructor(st) {
    this.st = st;

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
    if ((toSend === -1 && this.progress.size > 0 && this.progress.size > this.done.size) || toSend === this.st) {
      const progress = Math.min(100, [...this.progress.values()].reduce((a, x) => a + x[0], 0) / [...this.progress.values()].reduce((a, x) => a + x[1], 0) * 100); // Clamp progress to 0-100

      sendState(this.st ? 'installing' : 'downloading', {
        current: this.done.size + 1,
        total: this.total.size,
        progress
      });

      return true;
    }
  }
}

const initNew = async (inst) => {
  toSend = -1;

  const retryOptions = {
    skip_host_delta: true,
    skip_module_delta: {},
    skip_all_module_delta: false,
    skip_windows_arch_update: false,
    optin_windows_transition_progression: false
  };

  while (true) {
    sendState('checking-for-updates');

    try {
      let installedAnything = false;
      const downloads = new UIProgress(0);
      const installs = new UIProgress(1);

      await inst.updateToLatestWithOptions(retryOptions, ({ task, state, percent }) => {
        const download = task.HostDownload || task.ModuleDownload;
        const install = task.HostInstall || task.ModuleInstall;

        installedAnything = true;

        const simpleRecord = (tracker, x) => tracker.record(x.package_sha256, state, percent);

        if (download != null) simpleRecord(downloads, download);

        if (!downloads.send()) installs.send();

        if (install == null) return;
        simpleRecord(installs, install);

        if (task.ModuleInstall != null) {
          retryOptions.skip_module_delta[install.version.module.name] = true;
        }
      });

      if (!installedAnything) {
        await inst.startCurrentVersion({
          skip_windows_arch_update: false,
          optin_windows_transition_progression: false
        });
        inst.collectGarbage();

        return launchMain();
      }
    } catch (e) {
      log('Splash', e);
      await new Promise(r => fail(r));
    }
  }
};

const initOld = () => { // "Old" (not v2 / new, win32 only)
  const on = (k, v) => moduleUpdater.events.on(k, v);

  const check = () => moduleUpdater.checkForUpdates();

  const downloads = new UIProgress(0), installs = new UIProgress(1);

  const handleFail = () => {
    fail(check);
  };

  on('checked', ({ failed, count }) => { // Finished check
    installs.reset();
    downloads.reset();

    if (failed) handleFail();
      else if (!count) launchMain(); // Count is 0 / undefined
  });

  on('downloaded', ({ failed }) => { // Downloaded all modules
    toSend = 1;

    if (failed > 0) handleFail();
  });

  on('installed', check); // Installed all modules

  on('downloading-module', ({ name, cur, total }) => {
    downloads.record(name, '', cur, total);
    installs.record(name, 'Waiting');
  });

  on('installing-module', ({ name, cur, total }) => {
    installs.record(name, '', cur, total);
  });

  const segment = (tracker) => (({ name }) => {
    tracker.record(name, 'Complete');
  });

  on('downloaded-module', segment(downloads));
  on('installed-module', segment(installs));

  on('manual', (e) => sendState('manual', { details: e })); // Host manual update required

  sendState('checking-for-updates');

  check();
};

const fail = (c) => {
  sendState('fail', { seconds: 10 });

  setTimeout(c, 10000);
};