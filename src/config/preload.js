const { contextBridge, ipcRenderer } = require('electron');


contextBridge.exposeInMainWorld('Native', {
  restart: () => ipcRenderer.send('cr'),
  set: c => ipcRenderer.send('cs', c),
  get: () => ipcRenderer.sendSync('cg'),
  open: () => ipcRenderer.send('of')
});