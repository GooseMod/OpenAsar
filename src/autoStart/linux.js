const fs = require('fs');
const mkdirp = require('mkdirp');
const { join, basename, dirname } = require('path');
const { app } = require('electron');

const buildInfo = require('../utils/buildInfo');

const desktopPath = join(app.getPath('appData'), 'autostart', app.name + '-' + buildInfo.releaseChannel + '.desktop');

// Vars for use in desktop file content template
const exePath = app.getPath('exe');

// Template for desktop file
const desktopContent = `[Desktop Entry]
Type=Application
Exec=${exePath}
Hidden=false
NoDisplay=false
Name=${basename(process.execPath)}
Icon=${join(global.systemElectron ? '/usr/share/pixmaps/Discord' : dirname(exePath), 'discord.png')}
Comment=Text and voice chat for gamers.
X-GNOME-Autostart-enabled=true`;

exports.install = (callback) => {
  try {
    mkdirp.sync(dirname(desktopPath));
    return fs.writeFile(desktopPath, desktopContent, callback);
  } catch (e) {
    log('AutoStart', e);
    return callback(); // Callback anyway
  }
};

exports.update = (callback) => callback();

exports.uninstall = (callback) => fs.unlink(desktopPath, callback);

exports.isInstalled = (callback) => fs.access(desktopPath, fs.constants.F_OK, callback);