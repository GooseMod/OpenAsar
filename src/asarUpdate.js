const { get } = require('https');
const fs = require('original-fs'); // Use original-fs, not Electron's modified fs
const { join } = require('path');

const asarPath = join(require.main.filename, '..');
const downloadPath = join(asarPath, '..', 'app.asar.download');

const asarUrl = `https://github.com/GooseMod/OpenAsar/releases/download/${oaVersion.split('-')[0]}/app.asar`;

// todo: have these https utils centralised?
const redirs = url => new Promise(res => get(url, r => { // Minimal wrapper around https.get to follow redirects
  const loc = r.headers.location;
  if (loc) return redirs(loc).then(res);

  res(r);
}));

module.exports = async () => { // (Try) update asar
  log('AsarUpdate', 'Updating...');

  if (!oaVersion.includes('-')) return;

  const file = fs.createWriteStream(downloadPath);
  (await redirs(asarUrl)).pipe(file);

  await new Promise(res => file.on('finish', res));

  if (fs.readFileSync(downloadPath, 'utf8').startsWith('<')) return log('AsarUpdate', 'Download error');

  fs.copyFileSync(downloadPath, asarPath); // Overwrite actual app.asar
  fs.unlinkSync(downloadPath); // Delete downloaded temp file
};