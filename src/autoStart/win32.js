const { join, basename } = require('path');

const reg = (a, c) => require('child_process').execFile('reg.exe', a, c);

const appName = basename(process.execPath, '.exe');
const queuePrefix = [ 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run', '/v', appName ];


exports.install = (cb) => reg([ 'add', ...queuePrefix, '/d', join(process.execPath, '..', '..', 'Update.exe') + ' --processStart ' + basename(process.execPath) + (settings.get('START_MINIMIZED') ? ' --process-start-args --start-minimized' : ''), '/f' ], cb); // Make reg (with Electron args if start min)

exports.update = (cb) => exports.isInstalled(installed => installed ? exports.install(cb) : cb()); // Reinstall if installed, else just cb

exports.uninstall = (cb) => reg([ 'delete', ...queuePrefix, '/f' ], () => cb()); // Delete reg

exports.isInstalled = (cb) => reg([ 'query', ...queuePrefix ], (e, out) => cb(out.includes(appName))); // Check reg