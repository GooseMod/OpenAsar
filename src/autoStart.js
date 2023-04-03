const fs = require('fs');
const { join, basename, dirname } = require('path');
const { app } = require('electron');

const buildInfo = require('./utils/buildInfo');

const desktopPath = join(app.getPath('appData'), 'autostart', app.name + '-' + buildInfo.releaseChannel + '.desktop');

const exec = app.getPath('exe');

// Windows registry util
const reg = (a, c) => require('child_process').execFile('reg.exe', a, c);

const appName = basename(exec, '.exe');
const queuePrefix = [ 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run', '/v', appName ];

exports.install = cb => {
  switch (process.platform) {
    case 'win32':
      // Make reg (with Electron args if start min)
      reg([ 'add', ...queuePrefix, '/d', '"' + join(exec, '..', '..', 'Update.exe') + '" --processStart ' + basename(exec) + (settings.get('START_MINIMIZED') ? ' --process-start-args --start-minimized' : ''), '/f' ], cb);
      break;

    case 'linux':
      // Write desktop file for autostart
      fs.mkdirSync(dirname(desktopPath), { recursive: true });
      fs.writeFile(desktopPath, `[Desktop Entry]
Type=Application
Exec=${exec}
Name=${basename(exec)}
Icon=${join(global.systemElectron ? '/usr/share/pixmaps' : dirname(exec), 'discord.png')}
Comment=Text and voice chat for gamers.
X-GNOME-Autostart-enabled=true`, cb);
      break;

    default:
      cb();
  }
};

exports.uninstall = cb => {
  switch (process.platform) {
    case 'win32':
      // Delete reg
      reg([ 'delete', ...queuePrefix, '/f' ], () => cb());
      break;

    case 'linux':
      // Delete autostart desktop file
      fs.unlink(desktopPath, cb);
      break;

    default:
      cb();
  }
};

exports.update = cb => process.platform === 'win32' && exports.isInstalled(installed => installed ? exports.install(cb) : cb());

exports.isInstalled = cb => {
  switch (process.platform) {
    case 'win32':
      // Check reg
      reg([ 'query', ...queuePrefix ], (e, out) => cb(out.includes(appName)));
      break;

    case 'linux':
      // Check autostart desktop file exists
      fs.access(desktopPath, fs.constants.F_OK, cb);
      break;

    default:
      cb(false);
  }
};