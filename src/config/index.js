const { BrowserWindow, ipcMain, app } = require('electron');
const { join } = require('path');

const settings = require('../appSettings').getSettings();

ipcMain.on('DISCORD_UPDATED_QUOTES', (e, c) => {
  if (c === 'o') open();
});

const open = exports.open = () => {
  const win = new BrowserWindow({
    width: 500,
    height: 650,
    center: true,
    frame: false,
    resizable: false,
    center: true,
    backgroundColor: '#101418',
    webPreferences: {
      preload: join(__dirname, 'preload.js')
    }
  });

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

  win.loadURL('https://cdn.openasar.dev/config');
};