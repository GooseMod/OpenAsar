const paths = require('../paths');
const { join } = require('path');
const { copyFileSync, readdirSync } = require('original-fs'); // Use original-fs, not Electron's modified fs

module.exports = () => {
  log('RetainAsar', 'Detected possible host update, retaining OpenAsar...');

  const currentAsarPath = join(require.main.filename, '..');

  const installDir = paths.getInstallPath();

  const nextAppDir = readdirSync(installDir).reverse().find((x) => x.startsWith('app-1'));
  const nextAppResources = join(installDir, nextAppDir, 'resources');
  const nextAsarPath = join(nextAppResources, 'app.asar');
  const backupAsarPath = join(nextAppResources, 'app.asar.backup');

  if (nextAsarPath === currentAsarPath) return;

  log('RetainAsar', `Paths:
Install Dir: ${installDir}
Next App Dir: ${nextAppDir}
Current Asar: ${currentAsarPath}
Next Asar: ${nextAsarPath}`);

  copyFileSync(nextAsarPath, backupAsarPath);
  copyFileSync(currentAsarPath, nextAsarPath);

  log('RetainAsar', 'Completed');
};