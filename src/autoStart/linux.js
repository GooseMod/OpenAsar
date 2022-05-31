const fs = require('fs');
const { join, basename, dirname } = require('path');
const { app } = require('electron');

const buildInfo = require('../utils/buildInfo');

const desktopPath = join(app.getPath('appData'), 'autostart', app.name + '-' + buildInfo.releaseChannel + '.desktop');

// Vars for use in desktop file content template
const exec = app.getPath('exe');

// Template for desktop file
const desktopContent = `[Desktop Entry]
Type=Application
Exec=${exec}
Hidden=false
NoDisplay=false
Name=${basename(process.execPath)}
Icon=${join(global.systemElectron ? '/usr/share/pixmaps' : dirname(exec), 'discord.png')}
Comment=Text and voice chat for gamers.
X-GNOME-Autostart-enabled=true`;

exports.install = (cb) => {
  try {
    fs.mkdirSync(dirname(desktopPath), { recursive: true });
    fs.writeFile(desktopPath, desktopContent, cb);
  } catch {
    cb(); // Callback anyway
  }
};

exports.update = (cb) => cb();

exports.uninstall = (cb) => fs.unlink(desktopPath, cb);

exports.isInstalled = (cb) => fs.access(desktopPath, fs.constants.F_OK, cb);