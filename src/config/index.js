const { ipcMain, app } = require('electron');
const { join } = require('path');

ipcMain.on('DISCORD_UPDATED_QUOTES', (e, c) => {
  if (c === 'o') open();
});

const open = exports.open = () => {
  const win = require('../utils/win')({
    width: 500,
    height: 650
  }, join(__dirname, 'preload.js'), 'config');

  let config = settings.get('openasar', {});
  config.setup = true;
  settings.set('openasar', config);
  settings.save();

  ipcMain.on('cs', (e, c) => {
    config = c;
    settings.set('openasar', config);
    settings.save(); // Ensure saving
  });

  ipcMain.on('cg', e => {
    e.returnValue = config;
  });

  ipcMain.on('cr', () => {
    settings.save();
    app.relaunch();
    app.exit();
  });
};