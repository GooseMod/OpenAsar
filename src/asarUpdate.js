const { get } = require('./utils/get');
const fs = require('original-fs'); // Use original-fs, not Electron's modified fs
const { join } = require('path');

const asarPath = join(__filename, '..');

const asarUrl = `https://github.com/GooseMod/OpenAsar/releases/download/${oaVersion.split('-')[0]}/app.asar`;

module.exports = async () => { // (Try) update asar
  if (!oaVersion.includes('-')) return;
  log('AsarUpdate', 'Updating...');

  const buf = (await get(asarUrl))[1];

  if (!buf || !buf.toString('hex').startsWith('04000000')) return log('AsarUpdate', 'Download error'); // Request failed or ASAR header not present

  fs.writeFile(asarPath, buf, e => log('AsarUpdate', 'Downloaded', e ?? ''));
};