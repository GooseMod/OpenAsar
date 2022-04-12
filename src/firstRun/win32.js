const fs = require('fs');
const { join, resolve, basename } = require('path');

const Constants = require('../Constants');

const exec = process.execPath;
const name = basename(exec);
const app = resolve(exec, '..');
const root = resolve(app, '..');


exports.do = (updater) => {
  const flag = join(app, '.first-run');
  if (fs.existsSync(flag)) return; // Already done, skip

  const proto = Constants.APP_PROTOCOL;
  const base = 'HKCU\\Software\\Classes\\' + proto;

  require('../utils/registry').add([[base, '/ve', '/d', `URL:${proto} Protocol`], [base, '/v', 'URL Protocol'], [base + '\\DefaultIcon', '/ve', '/d', `"${process.execPath}",-1`], [base + '\\shell\\open\\command', '/ve', '/d', `"${process.execPath}" --url -- "%1"`]], () => { // Make protocol
    try { // Make shortcuts
      const file = Constants.APP_NAME_FOR_HUMANS + '.lnk';
      const icon_Path = join(root, 'app.ico');
  
      fs.copyFileSync(join(app, 'app.ico'), icon_path); // app-1.0.0/app.ico -> app.ico
  
      for (const shortcut_path of [
        join(updater.getKnownFolder('desktop'), file),
        join(updater.getKnownFolder('programs'), Constants.APP_COMPANY, file)
      ]) {
        if (!fs.existsSync(shortcut_path)) continue; // Don't update already deleted paths
  
        updater.createShortcut({
          target_path: join(root, 'Update.exe'),
          shortcut_path,
          arguments: '--processStart ' + basename(process.execPath),
          icon_path,
          icon_index: 0,
          description: Constants.APP_DESCRIPTION,
          app_user_model_id: Constants.APP_ID,
          working_directory: app
        });
      }

      fs.writeFileSync(flag, 'true');
    } catch (e) {
      log('FirstRun', e);
    }
  });
};