const { app, contextBridge, ipcRenderer } = require('electron');

const { saferShellOpenExternal } = require('../utils/securityUtils');


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
    const buildInfo = require('../utils/buildInfo');

    const urlParams = new URLSearchParams(window.location.search);

    return `${buildInfo.releaseChannel} ${buildInfo.version}
    OpenAsar ${urlParams.get('oaVersion')}`;
  }
});