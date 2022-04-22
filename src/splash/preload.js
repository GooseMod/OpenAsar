const { contextBridge, ipcRenderer } = require('electron');


contextBridge.exposeInMainWorld('Splash', {
  onState: callback => ipcRenderer.on('state', (_, state) => callback(state)),
  quit: () => ipcRenderer.send('sq'),
  skip: () => ipcRenderer.send('ss')
});