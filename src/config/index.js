const { ipcMain, app, shell } = require('electron');

ipcMain.on('DISCORD_UPDATED_QUOTES', (e, c) => {
  if (c === 'o') exports.open();
});

let win;
exports.open = () => {
  if (win && !win.isDestroyed()) return win.show();

  win = require('../utils/win')({
    width: 500,
    height: 650
  }, 'config');

  win.on('closed', () => {
    win = null;
  });

  let config = settings.get('openasar', {});
  config.setup = true;
  settings.set('openasar', config);
  settings.save();

  ipcMain.on('cs', (e, c) => {
    config = c;
    settings.set('openasar', config);
    settings.save();
  });

  ipcMain.on('cg', e => {
    e.returnValue = config;
  });

  ipcMain.on('cr', () => {
    settings.save();
    app.relaunch();
    app.exit();
  });

  ipcMain.on('of', () => {
    shell.openPath(require('../paths').getUserData() + '/settings.json')
  });
};