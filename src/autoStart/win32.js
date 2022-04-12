const { join, basename } = require('path');

const registry = require('../utils/registry');

const appName = basename(process.execPath, '.exe');
const queuePrefix = [ 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run', '/v', appName ];


exports.install = (cb) => registry.add([[ ...queuePrefix, '/d', join(process.execPath, '..', '..', 'Update.exe') + ` --processStart ${basename(process.execPath)}` + (settings.get('START_MINIMIZED') ? ' --process-start-args --start-minimized' : '') ]], cb); // Make reg (with Electron args if start min)

exports.update = (cb) => exports.isInstalled(installed => installed ? exports.install(cb) : cb()); // Reinstall if installed, else just cb

exports.uninstall = (cb) => registry.spawn([ 'delete', ...queuePrefix, '/f' ], () => cb()); // Delete reg

exports.isInstalled = (cb) => registry.spawn([ 'query', ...queuePrefix ], () => cb(stdout.includes(appName))); // Check reg