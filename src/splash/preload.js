const { contextBridge, ipcRenderer } = require('electron');


contextBridge.exposeInMainWorld('Splash', {
  onState: callback => ipcRenderer.on('SPLASH_STATE', (_, state) => callback(state))
});