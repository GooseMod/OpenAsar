const { app, ipcMain } = require('electron');

const updater = require("../updater");

let launched, win;


exports.initSplash = startMin => {
  update(updater.getUpdater());

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
    if (this.progress.size > 0 && this.progress.size > this.done.size) {
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

const update = async inst => {
  sendState('checking-for-updates');

  try {
    let installedAnything = false;
    const downloads = new UIProgress(0);
    const installs = new UIProgress(1);

    await inst.updateToLatestWithOptions({ canRestart: true }, ({ task, state, percent }) => {
      const download = task.HostDownload || task.ModuleDownload;
      const install = task.HostInstall || task.ModuleInstall;

      installedAnything = true;

      const simpleRecord = (tracker, x) => tracker.record(x.name, state, percent);

      if (download != null) simpleRecord(downloads, download);

      if (!downloads.send()) installs.send();

      if (install == null) return;
      simpleRecord(installs, install);
    });

    return launchMain();
  } catch (e) {
    log('Splash', e);
    await new Promise(r => fail(r));
  }
};


const fail = (c) => {
  sendState('fail', { seconds: 10 });

  setTimeout(c, 10000);
};