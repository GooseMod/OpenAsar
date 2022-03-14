const paths = require('../paths');
const { join } = require('path');
const fs = require('original-fs'); // Use original-fs, not Electron's modified fs

module.exports = () => {
  log('RetainAsar', 'Trying...');

  const current = join(require.main.filename, '..');

  const installDir = paths.getInstallPath();

  const nextRes = join(installDir, fs.readdirSync(installDir).reverse().find((x) => x.startsWith('app-1')), 'resources');
  const next = join(nextRes, 'app.asar');
  const backup = join(nextRes, 'app.asar.backup');

  if (next === current) return;

  fs.copyFileSync(next, backup);
  fs.copyFileSync(current, next);

  log('RetainAsar', 'Done');
};