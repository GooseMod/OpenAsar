const fs = require('fs');
const path = require('path');
const paths = require('../paths');
const squirrel = require('../updater/squirrelUpdate');
const Constants = require('../Constants');

const appPath = path.resolve(process.execPath, '..');
const rootPath = path.resolve(appFolder, '..');
const exeFilename = path.basename(process.execPath);
const updateExe = path.join(rootFolder, 'Update.exe');

const iconFile = 'app.ico';
const copyIconToRoot = () => {
  const currentPath = path.join(appPath, iconFile);
  const newPath = path.join(rootPath, iconFile);

  try {
    fs.copyFileSync(currentPath, newPath);
    return newPath;
  } catch (e) {
    log('FirstRun', 'Failed to copy icon to root', e);
    return currentPath;
  }
};

const updateShortcuts = (updater) => {
  const filename = Constants.APP_NAME_FOR_HUMANS + '.lnk';
  const paths = [
    path.join(updater.getKnownFolder('desktop'), filename),
    path.join(updater.getKnownFolder('programs'), Constants.APP_COMPANY, filename)
  ];

  const icon = copyIconToRoot();

  for (const path of paths) {
    if (!fs.existsSync(path)) continue; // Don't update already deleted paths

    updater.createShortcut({
      target_path: updateExe,
      shortcut_path: shortcutPath,
      arguments: `--processStart ${exeFilename}`,
      icon_path: icon,
      icon_index: 0,
      description: Constants.APP_DESCRIPTION,
      app_user_model_id: Constants.APP_ID,
      working_directory: appPath
    });
  }
};

exports.performFirstRunTasks = (updater) => {
  const flagPath = path.join(paths.getUserDataVersioned(), '.first-run');

  if (fs.existsSync(flagPath)) return; // Already ran first path, skip

  let shortcutSuccess = false;
  try {
    updateShortcuts(updater);
    shortcutSuccess = true;
  } catch (e) {
    log('FirstRun', 'Error updating shortcuts', e);
  }

  squirrel.installProtocol(Constants.APP_PROTOCOL, () => {
    if (shortcutSuccess) {
      try {
        fs.writeFileSync(firstRunCompletePath, 'true');
      } catch (e) {
        log('FirstRun', 'Error writing .first-run', e);
      }
    }
  });
};