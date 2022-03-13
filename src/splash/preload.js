const { contextBridge, ipcRenderer } = require('electron');


contextBridge.exposeInMainWorld('Splash', {
  onState: callback => ipcRenderer.on('state', (_, state) => callback(state))
});