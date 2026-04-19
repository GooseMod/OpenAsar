const fs = require('fs');
const { join, basename } = require('path');

const Constants = require('./Constants');
const reg = (a, c) => require('child_process').execFile('reg.exe', a, c);
const paths = require('./paths');

const exec = process.execPath;
exports.do = () => {
  const flag = join(paths.getUserDataVersioned(), '.first-run');
  if (fs.existsSync(flag)) return; // Already done, skip

  try {
    if (process.platform === 'win32') {
      const proto = Constants.APP_PROTOCOL;
      const base = 'HKCU\\Software\\Classes\\' + proto;

      for (const x of [
        [base, '/ve', '/d', `URL:${proto} Protocol`],
        [base, '/v', 'URL Protocol'],
        [base + '\\DefaultIcon', '/ve', '/d', `"${exec}",-1`],
        [base + '\\shell\\open\\command', '/ve', '/d', `"${exec}" --url -- "%1"`]
      ]) reg([ 'add', ...x, '/f' ], e => {});
    } else if (process.platform === 'linux') {
      const symlinkPath = join(paths.getUserData(), basename(exec));
      const symlinkTemp = symlinkPath + '-new';

      fs.rmSync(symlinkTemp, { force: true });
      fs.symlinkSync(exec, symlinkTemp);
      fs.renameSync(symlinkTemp, symlinkPath);
    }

    fs.writeFileSync(flag, '');
  } catch (e) {
    log('FirstRun', e);
  }
};
