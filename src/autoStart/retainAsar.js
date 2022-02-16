const paths = require('../paths');
const { join } = require('path');
const { copyFileSync, readdirSync } = require('original-fs'); // Use original-fs, not Electron's modified fs

module.exports = () => {
  log('RetainAsar', 'Trying...');

  const currentAsarPath = join(require.main.filename, '..');

  const installDir = paths.getInstallPath();

  const nextAppDir = readdirSync(installDir).reverse().find((x) => x.startsWith('app-1'));
  const nextAppResources = join(installDir, nextAppDir, 'resources');
  const nextAsarPath = join(nextAppResources, 'app.asar');
  const backupAsarPath = join(nextAppResources, 'app.asar.backup');

  if (nextAsarPath === currentAsarPath) return;

  copyFileSync(nextAsarPath, backupAsarPath);
  copyFileSync(currentAsarPath, nextAsarPath);

  log('RetainAsar', 'Done');
};