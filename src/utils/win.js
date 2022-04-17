const { BrowserWindow } = require('electron');

const paths = require('../paths');
const fs = require('fs');


module.exports = (opts, preload, url) => {
  const win = new BrowserWindow({
    center: true,
    frame: false,
    resizable: false,
    center: true,
    backgroundColor: '#2f3136',
    webPreferences: {
      preload
    },
    ...opts
  });

  const wc = win.webContents;
  wc.once('dom-ready', () => {
    if (oaConfig.themeSync !== false) try {
      wc.insertCSS(JSON.parse(fs.readFileSync(join(paths.getUserData(), 'userDataCache.json'), 'utf8')).openasarSplashCSS);
    } catch { }
  });

  win.loadURL(url);

  return win;
};