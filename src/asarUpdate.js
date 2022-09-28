const request = require('request');
const fs = require('original-fs'); // Use original-fs, not Electron's modified fs
const { join } = require('path');

const asarPath = join(require.main.filename, '..');
const downloadPath = join(asarPath, '..', 'app.asar.download');

const asarUrl = `https://github.com/GooseMod/OpenAsar/releases/download/${oaVersion.split('-')[0]}/app.asar`;

module.exports = async () => { // (Try) update asar
  log('AsarUpdate', 'Updating...');

  if (!oaVersion.includes('-')) return;

  await new Promise((res) => {
    const file = fs.createWriteStream(downloadPath);

    file.on('finish', () => {
      file.close();
      res();
    });

    request.get(asarUrl).on('response', r => r.pipe(file));
  });

  if (fs.readFileSync(downloadPath, 'utf8').startsWith('<')) return log('AsarUpdate', 'Download error');

  fs.copyFileSync(downloadPath, asarPath); // Overwrite actual app.asar
  fs.unlinkSync(downloadPath); // Delete downloaded temp file
};