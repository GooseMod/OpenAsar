const { get } = require('https');
const fs = require('original-fs'); // Use original-fs, not Electron's modified fs
const { join } = require('path');

// todo: have these https utils centralised?
const redirs = url => new Promise(res => get(url, r => { // Minimal wrapper around https.get to follow redirects
  const loc = r.headers.location;
  if (loc) return redirs(loc).then(res);

  res(r);
}));

module.exports = async () => { // (Try) update asar
  if (global.oaDisableAutoUpdate) return log('AsarUpdate', 'Skipping build-configured auto-update disable');
  if (!oaVersion.includes('-')) return;
  const releaseChannel = oaVersion.split('-')[0];

  log('AsarUpdate', 'Updating...');

  const res = (await redirs(`https://github.com/GooseMod/OpenAsar/releases/download/${releaseChannel}/app.asar`));

  let data = [];
  res.on('data', d => {
    data.push(d);
  });

  await new Promise(done => res.on('end', () => {
    const buf = Buffer.concat(data);
    if (!buf.toString('hex').startsWith('04000000')) return log('AsarUpdate', 'Download error'); // Not like ASAR header

    fs.writeFile(join(__filename, '..'), buf, e => {
      log('AsarUpdate', 'Downloaded', e ?? '');
      done();
    });
  }));
};
