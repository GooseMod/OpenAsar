const fs = require('fs');
const { join, resolve, basename } = require('path');
const paths = require('../paths');
const windowsUtils = require('../utils/windowsUtils');
const Constants = require('../Constants');

const appPath = resolve(process.execPath, '..');
const rootPath = resolve(appPath, '..');

const iconFile = 'app.ico';
const copyIconToRoot = () => {
  const currentPath = join(appPath, iconFile);
  const newPath = join(rootPath, iconFile);

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
    join(updater.getKnownFolder('desktop'), filename),
    join(updater.getKnownFolder('programs'), Constants.APP_COMPANY, filename)
  ];

  const icon = copyIconToRoot();

  for (const path of paths) {
    if (!fs.existsSync(path)) continue; // Don't update already deleted paths

    updater.createShortcut({
      target_path: join(rootPath, 'Update.exe'),
      shortcut_path: path,
      arguments: '--processStart ' + basename(process.execPath),
      icon_path: icon,
      icon_index: 0,
      description: Constants.APP_DESCRIPTION,
      app_user_model_id: Constants.APP_ID,
      working_directory: appPath
    });
  }
};

const installProtocol = (protocol, callback) => {
  const base = 'HKCU\\Software\\Classes\\' + protocol;
  windowsUtils.addToRegistry([[base, '/ve', '/d', `URL:${protocol} Protocol`], [base, '/v', 'URL Protocol'], [base + '\\DefaultIcon', '/ve', '/d', '"' + process.execPath + '",-1'], [base + '\\shell\\open\\command', '/ve', '/d', `"${process.execPath}" --url -- "%1"`]], callback);
};

exports.performFirstRunTasks = (updater) => {
  log('FirstRun', 'Perform');

  const flagPath = join(paths.getUserDataVersioned(), '.first-run');
  if (fs.existsSync(flagPath)) return; // Already done, skip

  let shortcutSuccess = false;
  try {
    updateShortcuts(updater);
    shortcutSuccess = true;
  } catch (e) {
    log('FirstRun', 'Error updating shortcuts', e);
  }

  installProtocol(Constants.APP_PROTOCOL, () => {
    if (!shortcutSuccess) return;

    try {
      fs.writeFileSync(firstRunCompletePath, 'true');
    } catch (e) {
      log('FirstRun', 'Error writing .first-run', e);
    }
  });
};