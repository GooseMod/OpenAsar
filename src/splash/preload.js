const { contextBridge, ipcRenderer } = require('electron');

const { saferShellOpenExternal } = require('../utils/securityUtils');


contextBridge.exposeInMainWorld('DiscordSplash', {
  signalReady: () => ipcRenderer.send('DISCORD_SPLASH_SCREEN_READY'),

  onStateUpdate: callback => ipcRenderer.on('DISCORD_SPLASH_UPDATE_STATE', (_, state) => callback(state)),

  openUrl: saferShellOpenExternal,
  quitDiscord: () => ipcRenderer.send('DISCORD_SPLASH_SCREEN_QUIT')
});