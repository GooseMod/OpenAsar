const { app, contextBridge, ipcRenderer } = require('electron');

const { saferShellOpenExternal } = require('../utils/securityUtils');

const urlParams = new URLSearchParams(window.location.search);


contextBridge.exposeInMainWorld('DiscordSplash', {
  signalReady: () => {
    ipcRenderer.send('DISCORD_SPLASH_SCREEN_READY');
  },

  onStateUpdate: callback => {
    ipcRenderer.on('DISCORD_SPLASH_UPDATE_STATE', (_, state) => {
      callback(state);
    });
  },

  openUrl: saferShellOpenExternal,
  quitDiscord: () => ipcRenderer.send('DISCORD_SPLASH_SCREEN_QUIT'),

  getDebugInfo: () => {
    if (urlParams.get('oaSplashText') === 'false') return '';

    const buildInfo = require('../utils/buildInfo');

    return `${buildInfo.releaseChannel} ${buildInfo.version}
    OpenAsar ${urlParams.get('oaVersion')}`;
  },

  getCSS: callback => urlParams.get('oaThemeSync') !== 'false' ? ipcRenderer.on('DISCORD_GET_CSS', (_, value) => {
    callback(value);
  }) : {}
});