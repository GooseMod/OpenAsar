const { join, basename } = require('path');

const reg = (a, c) => require('child_process').execFile('reg.exe', a, c);

const exec = process.execPath;
const appName = basename(exec, '.exe');
const prefix = [ 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run', '/v', appName ];


exports.install = cb => reg([ 'add', ...prefix, '/d', join(exec, '..', '..', 'Update.exe') + ' --processStart ' + basename(exec) + (settings.get('START_MINIMIZED') ? ' --process-start-args --start-minimized' : ''), '/f' ], cb); // Make reg (with Electron args if start min)

exports.update = cb => exports.isInstalled(inst => inst ? exports.install(cb) : cb()); // Reinstall if installed, else just cb

exports.uninstall = cb => reg([ 'delete', ...prefix, '/f' ], () => cb()); // Delete reg

exports.isInstalled = cb => reg([ 'query', ...prefix ], (e, out) => cb(out.includes(appName))); // Check reg