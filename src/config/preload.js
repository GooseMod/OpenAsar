const { contextBridge, ipcRenderer } = require('electron');


contextBridge.exposeInMainWorld('Native', {
  restart: () => ipcRenderer.send('config_restart'),
  set: c => ipcRenderer.send('config_set', c),
  get: () => ipcRenderer.sendSync('config_get')
});