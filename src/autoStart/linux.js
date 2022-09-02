const fs = require('fs');
const { join, basename, dirname } = require('path');
const { app } = require('electron');

const desktopPath = join(app.getPath('appData'), 'autostart', app.name + '-' + buildInfo.releaseChannel + '.desktop');

const exec = process.execPath;

// Template for desktop file
const desktopContent = `[Desktop Entry]
Type=Application
Exec=${exec}
Name=${basename(exec)}
Icon=${join(global.systemElectron ? '/usr/share/pixmaps' : dirname(exec), 'discord.png')}
X-GNOME-Autostart-enabled=true`;

exports.install = cb => {
  try {
    fs.mkdirSync(dirname(desktopPath), { recursive: true });
    fs.writeFile(desktopPath, desktopContent, cb);
  } catch {
    cb(); // Callback anyway
  }
};

exports.update = cb => cb();

exports.uninstall = cb => fs.unlink(desktopPath, cb);

exports.isInstalled = cb => fs.access(desktopPath, fs.constants.F_OK, cb);