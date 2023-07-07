const { get } = require('https');
const fs = require('original-fs'); // Use original-fs, not Electron's modified fs
const { join } = require('path');

const asarPath = join(__filename, '..');

const asarUrl = `https://github.com/GooseMod/OpenAsar/releases/download/${oaVersion.split('-')[0]}/app.asar`;

// todo: have these https utils centralised?
const redirs = url => new Promise(res => get(url, r => { // Minimal wrapper around https.get to follow redirects
  const loc = r.headers.location;
  if (loc) return redirs(loc).then(res);

  res(r);
}));

module.exports = async () => { // (Try) update asar
  if (!oaVersion.includes('-')) return;
  log('AsarUpdate', 'Updating...');

  const res = (await redirs(asarUrl));

  let data = [];
  res.on('data', d => {
    data.push(d);
  });

  res.on('end', () => {
    const buf = Buffer.concat(data);
    if (!buf.toString('hex').startsWith('04000000')) return log('AsarUpdate', 'Download error'); // Not like ASAR header

    fs.writeFile(asarPath, buf, e => log('AsarUpdate', 'Downloaded', e ?? ''));
  });
};