const { contextBridge, ipcRenderer } = require('electron');


contextBridge.exposeInMainWorld('DiscordSplash', {
  onStateUpdate: callback => ipcRenderer.on('SPLASH_STATE', (_, state) => callback(state))
});