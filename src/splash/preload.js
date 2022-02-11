const { contextBridge, ipcRenderer } = require('electron');


contextBridge.exposeInMainWorld('DiscordSplash', {
  onStateUpdate: callback => ipcRenderer.on('DISCORD_SPLASH_UPDATE_STATE', (_, state) => callback(state))
});