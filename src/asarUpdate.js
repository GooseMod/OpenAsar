const request = require('request');
const fs = require('original-fs'); // Use original-fs, not Electron's modified fs
const crypto = require('crypto');
const electron = require('electron');
const { join } = require('path');

const asarPath = join(require.main.filename, '..');
log('AsarUpdate', 'Asar Path:', asarPath);

const downloadPath = join(require.main.filename, '..', '..', 'app.asar.download');
log('AsarUpdate', 'Download Path:', downloadPath);

const downloadUrls = {
  nightly: 'https://github.com/GooseMod/OpenAsar/releases/download/nightly/app.asar'
};

const channel = 'nightly'; // Have prod, etc. once stable / 1.0

const getAsarHash = () => crypto.createHash('sha512').update(fs.readFileSync(asarPath)).digest('hex');

module.exports = async () => { // (Try) update asar
  log('AsarUpdate', 'Updating...');

  if (!oaVersion.startsWith('nightly-')) {
    return log('AsarUpdate', 'Found non-standard version, not updating');
  }

  const asarUrl = downloadUrls[channel];
  log('AsarUpdate', 'Release Channel:', channel, 'Download URL:', asarUrl);

  const originalHash = getAsarHash();
  log('AsarUpdate', 'Original Hash:', originalHash);

  const downloadSuccess = await new Promise((res) => {
    const file = fs.createWriteStream(downloadPath);

    let writeError = false;
    file.on('error', err => {
      log('AsarUpdate', 'Failed to write', err);
      file.close();

      writeError = true;
      res(false);
    });

    log('AsarUpdate', 'Opened write stream to download asar');

    const req = request.get(asarUrl);

    req.on('response', (res) => {
      if (writeError) return;

      log('AsarUpdate', 'Piping download response to stream');
      res.pipe(file);
    });

    file.on('finish', () => {
      file.close();
      res(true);
    });
  });

  if (!downloadSuccess) {
    log('AsarUpdate', 'Aborting rest of update due to download error');
    return;
  }

  log('AsarUpdate', 'Completed download, copying over');

  const copySuccess = await new Promise((res) => {
    try {
      fs.copyFileSync(downloadPath, asarPath); // Overwrite actual app.asar
      fs.unlinkSync(downloadPath); // Delete downloaded temp file
      res(true);
    } catch (err) {
      log('AsarUpdate', 'Copy error', err);
      res(false);
    }
  });

  if (!copySuccess) {
    log('AsarUpdate', 'Aborting rest of update due to copy error');
    return;
  }

  const newHash = getAsarHash();
  const changed = originalHash !== newHash;

  log('AsarUpdate', `Hash Comparison:
Original Hash: ${originalHash}
New Hash: ${newHash}
Changed: ${changed}`);

  if (changed && oaConfig.updatePrompt === true) {
    const { response } = await electron.dialog.showMessageBox(null, {
      message: 'Updated OpenAsar',
      detail: `Restart required to use new version.`,
      buttons: ['Restart Now', 'Later'],
      defaultId: 0
    });

    log('AsarUpdate', 'Modal response', response);

    if (response === 0) {
      log('AsarUpdate', 'Restarting');

      electron.app.relaunch();
      electron.app.exit();
    }
  }
};