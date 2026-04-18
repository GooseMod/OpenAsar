const { join, dirname, basename } = require('path');
const { app } = require('electron');

const buildInfo = require('./utils/buildInfo');

let userData, userDataVersioned, resourcesPath, moduleData, exeDir, installPath, rootPath, logPath, assetCachePath;
exports.getUserData = () => userData;
exports.getUserDataVersioned = () => userDataVersioned;
exports.getResources = () => resourcesPath;
exports.getModuleDataPath = () => moduleData;
exports.getInstallPath = () => installPath;
exports.getRootPath = () => rootPath;
exports.getLogPath = () => logPath;
exports.getExeDir = () => exeDir;
exports.getAssetCachePath = () => assetCachePath;
exports.cleanOldVersions = () => {}; // stub for now


exports.init = () => {
  const appDir = 'discord' + (buildInfo.releaseChannel === 'stable' ? '' : buildInfo.releaseChannel); // Clean channel naming up later to util?
  userData = process.env.DISCORD_USER_DATA_DIR ?? join(app.getPath('appData'), appDir);
  userDataVersioned = join(userData, buildInfo.version);

  exeDir = dirname(app.getPath('exe'));
  if (basename(exeDir).startsWith('app-')) {
    installPath = join(exeDir, '..');
  } else if (process.platform === 'darwin') {
    installPath = join(exeDir, '..', '..', '..');
  }
  rootPath = process.platform === 'darwin' ? userData : installPath;

  moduleData = buildInfo.newUpdater ? join(userData, 'module_data') : join(userDataVersioned, 'modules');
  resourcesPath = join(process.resourcesPath);
  logPath = join(userData, 'logs');
  assetCachePath = join(userData, 'discord_asset_cache');

  global.moduleDataPath = moduleData; // Global because discord
  global.logPath = logPath; // Global because discord
  global.assetCachePath = assetCachePath;

  app.setPath('userData', userData); // Set userData properly because electron
};
