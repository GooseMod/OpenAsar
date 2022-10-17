const fs = require('fs');
const { join, resolve } = require('path');

const Constants = require('./Constants');
const reg = (a, c) => require('child_process').execFile('reg.exe', a, c);

const exec = process.execPath;
const app = resolve(exec, '..');


exports.do = () => {
  const flag = join(app, '.first-run');
  if (fs.existsSync(flag)) return; // Already done, skip

  const proto = Constants.APP_PROTOCOL;
  const base = 'HKCU\\Software\\Classes\\' + proto;

  for (const x of [
    [base, '/ve', '/d', `URL:${proto} Protocol`],
    [base, '/v', 'URL Protocol'],
    [base + '\\DefaultIcon', '/ve', '/d', `"${exec}",-1`],
    [base + '\\shell\\open\\command', '/ve', '/d', `"${exec}" --url -- "%1"`]
  ]) reg([ 'add', ...x, '/f' ], e => {});

  try {
    fs.writeFileSync(flag, '');
  } catch (e) {
    log('FirstRun', e);
  }
};