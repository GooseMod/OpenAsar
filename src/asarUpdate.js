const request = require('request');
const fs = require('original-fs'); // Use original-fs, not Electron's modified fs
const crypto = require('crypto');
const electron = require('electron');
const { join } = require('path');

const asarPath = join(require.main.filename, '..');
log('AsarUpdate', 'Asar Path:', asarPath);

const downloadUrls = {
  nightly: 'https://github.com/GooseMod/OpenAsar/releases/download/nightly/app.asar'
};

const channel = 'nightly'; // Have prod, etc. once stable / 1.0

const getAsarHash = () => crypto.createHash('sha512').update(fs.readFileSync(asarPath)).digest('hex');

module.exports = () => { // (Try) update asar
  log('AsarUpdate', 'Updating...');

  const asarUrl = downloadUrls[channel];
  log('AsarUpdate', 'Release Channel:', channel, 'Download URL:', asarUrl);

  const originalHash = getAsarHash();
  log('AsarUpdate', 'Original Hash:', originalHash);

  const file = fs.createWriteStream(asarPath);
  log('AsarUpdate', 'Opened write stream to asar');

  request(asarUrl, (_err, res) => {
    log('AsarUpdate', 'Piping download response to stream');
    res.pipe(file);
  });

  file.on('finish', () => {
    file.close();
    log('AsarUpdate', 'Completed download');

    const newHash = getAsarHash();
    const changed = originalHash !== newHash;

    log('AsarUpdate', `Hash Comparison:
Original Hash: ${originalHash}
New Hash: ${newHash}
Changed: ${changed}`);

    if (changed) {
      electron.dialog.showMessageBox(null, {
        message: 'Updated OpenAsar',
        detail: `New version will be used next restart.`
      });
    }
  });
};