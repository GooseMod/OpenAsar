const path = require('path');

const windowsUtils = require('../utils/windowsUtils');
const retainAsar = require('./retainAsar');

const appSettings = require('../appSettings');
const settings = appSettings.getSettings();

const appName = path.basename(process.execPath, '.exe');
const fullExeName = path.basename(process.execPath);
const updatePath = path.join(path.dirname(process.execPath), '..', 'Update.exe');

exports.install = (callback) => {
  log('AutoStart', 'Install');

  let execPath = `${updatePath} --processStart ${fullExeName}`;

  if (settings.get('START_MINIMIZED', false)) { // If start minimized enabled, pass it to Electron via --process-start-args
    execPath += ' --process-start-args --start-minimized';
  }

  windowsUtils.addToRegistry([['HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run', '/v', appName, '/d', execPath]], callback); // Make reg
};

exports.update = (callback) => {
  log('AutoStart', 'Update');

  exports.isInstalled(installed => installed ? exports.install(callback) : callback()); // Reinstall if installed, else leave it (just callback)

  retainAsar(); // Retain OpenAsar
};

exports.uninstall = (callback) => {
  log('AutoStart', 'Uninstall');

  windowsUtils.spawnReg(['delete', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run', '/v', appName, '/f'], (_error, _stdout) => { // Delete reg
    callback();
  });
};

exports.isInstalled = (callback) => {
  windowsUtils.spawnReg(['query', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run', '/v', appName], (_error, stdout) => { // Check reg
    callback(stdout.indexOf(appName) > -1);
  });
};