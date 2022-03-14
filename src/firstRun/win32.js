const fs = require('fs');
const { join, resolve, basename } = require('path');

const paths = require('../paths');
const registry = require('../utils/registry');
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
  try {
    const filename = Constants.APP_NAME_FOR_HUMANS + '.lnk';

    const icon_path = copyIconToRoot();

    for (const shortcut_path of [
    join(updater.getKnownFolder('desktop'), filename),
    join(updater.getKnownFolder('programs'), Constants.APP_COMPANY, filename)
    ]) {
      if (!fs.existsSync(shortcut_path)) continue; // Don't update already deleted paths

      updater.createShortcut({
        target_path: join(rootPath, 'Update.exe'),
        shortcut_path,
        arguments: '--processStart ' + basename(process.execPath),
        icon_path,
        icon_index: 0,
        description: Constants.APP_DESCRIPTION,
        app_user_model_id: Constants.APP_ID,
        working_directory: appPath
      });
    }

    return true;
  } catch (e) {
    log('FirstRun', 'Shortcuts error', e);
  }
};

exports.performFirstRunTasks = (updater) => {
  log('FirstRun', 'Perform');

  const flagPath = join(paths.getUserDataVersioned(), '.first-run');
  if (fs.existsSync(flagPath)) return; // Already done, skip

  const shortcutSuccess = updateShortcuts(updater);

  registry.installProtocol(Constants.APP_PROTOCOL, () => {
    if (!shortcutSuccess) return;

    try {
      fs.writeFileSync(flagPath, 'true');
    } catch (e) {
      log('FirstRun', 'Error writing .first-run', e);
    }
  });
};