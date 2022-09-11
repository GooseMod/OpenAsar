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

const update = async inst => {
  sendState('checking-for-updates');

  try {
    const progress = {};

    await inst.updateToLatestWithOptions({ restart: true }, ({ task, current, total, percent }) => {
      const download = task.ModuleDownload;
      if (download != null) progress[download.name] = { current, total, percent };

      const progVals = Object.values(progress);
      sendState('modules', {
        current: Math.min(progVals.filter(x => x.current === x.total).length + 1, progVals.length),
        total: progVals.length,
        progress: Math.min(100, progVals.reduce((a, x) => a + x.current, 0) / progVals.reduce((a, x) => a + x.total, 0) * 100),
        details: progress
      });
    });

    return launchMain();
  } catch (e) {
    log('Splash', e);
    await new Promise(fail);
  }
};


const fail = c => {
  sendState('fail', { seconds: 10 });

  setTimeout(c, 10000);
};