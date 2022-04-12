const fs = require('fs');
const { join, resolve, basename } = require('path');

const registry = require('../utils/registry');
const Constants = require('../Constants');

const appPath = resolve(process.execPath, '..');
const rootPath = resolve(appPath, '..');


const updateShortcuts = (updater) => {
  try {
    const file = Constants.APP_NAME_FOR_HUMANS + '.lnk';
    const icon_Path = join(rootPath, 'app.ico');

    try {
      fs.copyFileSync(join(appPath, 'app.ico'), icon_path);
    } catch { }

    for (const shortcut_path of [
      join(updater.getKnownFolder('desktop'), file),
      join(updater.getKnownFolder('programs'), Constants.APP_COMPANY, file)
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
    log('FirstRun', e);
  }
};


exports.do = (updater) => {
  const flag = join(appPath, '.first-run');
  if (fs.existsSync(flag)) return; // Already done, skip

  registry.installProtocol(Constants.APP_PROTOCOL, () => {
    if (!updateShortcuts(updater)) return;

    try {
      fs.writeFileSync(flag, 'true');
    } catch (e) {
      log('FirstRun', e);
    }
  });
};