const request = require('request');
const fs = require('original-fs'); // Use original-fs, not Electron's modified fs
const { createHash } = require('crypto');
const { dialog, app } = require('electron');
const { join } = require('path');

const asarPath = join(require.main.filename, '..');
const downloadPath = join(asarPath, '..', 'app.asar.download');

const asarUrl = `https://github.com/GooseMod/OpenAsar/releases/download/${oaVersion.split('-')[0]}/app.asar`;

const getAsarHash = () => createHash('sha512').update(fs.readFileSync(asarPath)).digest('hex');

module.exports = async () => { // (Try) update asar
  log('AsarUpdate', 'Updating...');

  if (!oaVersion.includes('-')) return log('AsarUpdate', 'Non-standard version');

  const originalHash = getAsarHash();

  await new Promise((res) => {
    const file = fs.createWriteStream(downloadPath);

    file.on('error', e => {
      log('AsarUpdate', e);
      file.close();

      res();
    });

    file.on('finish', () => {
      file.close();
      res();
    });

    const req = request.get(asarUrl);

    req.on('response', (res) => res.pipe(file));
  });

  if (fs.readFileSync(downloadPath, 'utf8').startsWith('<Error>')) return log('AsarUpdate', 'Download error');

  if (await new Promise((res) => {
    try {
      fs.copyFileSync(downloadPath, asarPath); // Overwrite actual app.asar
      fs.unlinkSync(downloadPath); // Delete downloaded temp file
      res();
    } catch (err) {
      log('AsarUpdate', err);
      res(true);
    }
  })) return;

  const newHash = getAsarHash();

  if (oaConfig.updatePrompt === true && originalHash !== newHash) {
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