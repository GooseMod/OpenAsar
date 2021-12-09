// Discord's wrapper around ipcMain
const { ipcMain } = require('electron');

exports.on = (event, callback) => ipcMain.on('DISCORD_' + event, callback);
exports.removeListener = (event, callback) => ipcMain.removeListener('DISCORD_' + event, callback);