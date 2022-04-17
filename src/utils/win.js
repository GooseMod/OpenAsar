const { BrowserWindow } = require('electron');

const paths = require('../paths');
const fs = require('fs');


module.exports = (o, preload, u) => {
  const w = new BrowserWindow({
    center: true,
    frame: false,
    resizable: false,
    center: true,
    backgroundColor: '#2f3136',
    webPreferences: {
      preload
    },
    ...o
  });

  const c = w.webContents;
  c.once('dom-ready', () => {
    if (oaConfig.themeSync !== false) try {
      c.insertCSS(JSON.parse(fs.readFileSync(join(paths.getUserData(), 'userDataCache.json'), 'utf8')).openasarSplashCSS);
    } catch { }
  });

  w.loadURL('https://cdn.openasar.dev/' + u);

  return w;
};