const { contextBridge, ipcRenderer } = require('electron');


contextBridge.exposeInMainWorld('DiscordSplash', {
  signalReady: () => ipcRenderer.send('DISCORD_SPLASH_SCREEN_READY'),
  onStateUpdate: callback => ipcRenderer.on('DISCORD_SPLASH_UPDATE_STATE', (_, state) => callback(state))
});