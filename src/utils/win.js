module.exports = (o, n) => {
  const w = new (require('electron').BrowserWindow)({
    // frame: false,
    frame: false,
    backgroundColor: '#00000000',
    show: n === 'config',
    menubar: false,
    resizable: false,
    webPreferences: {
      preload: require('path').join(__dirname, '..', n, 'preload.js')
    },
    ...o
  });

  const c = w.webContents;
  c.once('dom-ready', () => {
    if (oaConfig.themeSync !== false) try {
      c.insertCSS(JSON.parse(require('fs').readFileSync(require('path').join(require('../paths').getUserData(), 'userDataCache.json'), 'utf8')).openasarSplashCSS);
    } catch { }
  });

  w.loadURL('https://cdn.openasar.dev/' + n + '?v=' + oaVersion);

  w.webContents.insertCSS(`html, body { background: transparent !important; }`);

  // w.loadURL('http://localhost:1337/' + n + '?v=' + oaVersion);

  // require('electron').nativeTheme.themeSource = 'dark';
  // vibe.applyEffect(w, 'acrylic');
  // vibe.clearEffects(w);
  vibe.applyEffect(w, 'acrylic');

  // setTimeout(() => vibe.applyEffect(w, 'acrylic'), 3000);
  return w;
};