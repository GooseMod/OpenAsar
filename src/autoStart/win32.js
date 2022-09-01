const { join, basename } = require('path');

const reg = (a, c) => require('child_process').execFile('reg.exe', a, c);

const appName = basename(process.execPath, '.exe');
const prefix = [ 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run', '/v', appName ];


exports.install = cb => reg([ 'add', ...prefix, '/d', join(process.execPath, '..', '..', 'Update.exe') + ' --processStart ' + basename(process.execPath) + (settings.get('START_MINIMIZED') ? ' --process-start-args --start-minimized' : ''), '/f' ], cb); // Make reg (with Electron args if start min)

exports.update = cb => exports.isInstalled(inst => inst ? exports.install(cb) : cb()); // Reinstall if installed, else just cb

exports.uninstall = cb => reg([ 'delete', ...prefix, '/f' ], () => cb()); // Delete reg

exports.isInstalled = cb => reg([ 'query', ...prefix ], (e, out) => cb(out.includes(appName))); // Check reg