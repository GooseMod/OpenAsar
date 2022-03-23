const request = require('request');
const fs = require('original-fs'); // Use original-fs, not Electron's modified fs
const crypto = require('crypto');
const { dialog, app } = require('electron');
const { join } = require('path');

const asarPath = join(require.main.filename, '..');
const downloadPath = join(asarPath, '..', 'app.asar.download');

const asarUrl = `https://github.com/GooseMod/OpenAsar/releases/download/${oaVersion.split('-')[0]}/app.asar`;

const getAsarHash = () => crypto.createHash('sha512').update(fs.readFileSync(asarPath)).digest('hex');

module.exports = async () => { // (Try) update asar
  log('AsarUpdate', 'Updating...');

  if (!oaVersion.includes('-')) return log('AsarUpdate', 'Non-standard version');

  const originalHash = getAsarHash();

  const downloadSuccess = await new Promise((res) => {
    const file = fs.createWriteStream(downloadPath);

    let writeError = false;
    file.on('error', err => {
      log('AsarUpdate', 'Failed to write', err);
      file.close();

      writeError = true;
      res(false);
    });

    const req = request.get(asarUrl);

    req.on('response', (res) => {
      if (writeError) return;

      res.pipe(file);
    });

    file.on('finish', () => {
      file.close();
      res(true);
    });
  });

  if (!downloadSuccess || fs.readFileSync(downloadPath, 'utf8').startsWith('<Error>')) return log('AsarUpdate', 'Download error');

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

  if (!copySuccess) return;

  const newHash = getAsarHash();
  const changed = originalHash !== newHash;

  log('AsarUpdate', `Hash Comparison:
Original: ${originalHash}
New: ${newHash}`);

  if (changed && oaConfig.updatePrompt === true) {
    const { response } = await dialog.showMessageBox(null, {
      message: 'Updated OpenAsar',
      detail: `Restart required to use new version.`,
      buttons: ['Restart Now', 'Later'],
      defaultId: 0
    });

    if (response === 0) {
      app.relaunch();
      app.exit();
    }
  }
};