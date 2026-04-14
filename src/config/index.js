const { ipcMain, app, shell } = require('electron');

ipcMain.on('DISCORD_UPDATED_QUOTES', (e, c) => {
  if (c === 'o') exports.open();
});

const restart = () => {
  app.relaunch();
  app.exit(0);
};

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
    if (typeof c === 'string') {
      global.oaVersion = c + '-';
      require('../asarUpdate')().then(restart);
      return;
    }

    config = c;
    settings.set('openasar', config);
    settings.save();
  });

  ipcMain.on('cg', e => {
    e.returnValue = config;
  });

  ipcMain.on('cr', () => {
    settings.save();
    restart();
  });

  ipcMain.on('of', () => {
    shell.openPath(require('../paths').getUserData() + '/settings.json');
  });
};
