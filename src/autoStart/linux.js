const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const buildInfo = require('../utils/buildInfo');

const autostartDir = path.join(app.getPath('appData'), 'autostart');
const desktopPath = path.join(autostartDir, (app.name ? app.name : app.getName()) + '-' + buildInfo.releaseChannel + '.desktop');

// Vars for use in desktop file content template
const appName = path.basename(process.execPath, '.exe');
const exePath = app.getPath('exe');
const iconPath = path.join(path.dirname(exePath), 'discord.png');

// Template for desktop file
const desktopContent = `[Desktop Entry]
Type=Application
Exec=${exePath}
Hidden=false
NoDisplay=false
Name=${appName}
Icon=${iconPath}
Comment=Text and voice chat for gamers.
X-GNOME-Autostart-enabled=true
`;

exports.install = (callback) => {
  try {
    fs.mkdirSync(autostartDir);
  } catch (_e) { } // Already exists, ignore

  try {
    return fs.writeFile(desktopPath, desktopContent, callback);
  } catch (e) {
    log('AutoStart', 'Install: error writing file', e);
    return callback(); // Callback anyway
  }
};

exports.update = (callback) => { // Discord has stub here
  callback();
};

exports.uninstall = (callback) => {
  return fs.unlink(desktopPath, callback);
};

exports.isInstalled = (callback) => {
  return fs.access(desktopPath, fs.constants.F_OK, callback);
};