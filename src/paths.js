const { join, dirname, basename } = require('path');
const fs = require('fs');
const { app } = require('electron');

const buildInfo = require('./utils/buildInfo');


const appDir = 'discord' + (buildInfo.releaseChannel === 'stable' ? '' : buildInfo.releaseChannel); // Clean channel naming up later to util?
const userData = join(app.getPath('appData'), appDir);
const userDataVersioned = join(userData, buildInfo.version);

const exeDir = dirname(app.getPath('exe'));
const installPath = /^app-[0-9]+\.[0-9]+\.[0-9]+/.test(basename(exeDir)) ? join(exeDir, '..') : null;

const moduleData = buildInfo.newUpdater ? join(userData, 'module_data') : join(userDataVersioned, 'modules');
const resourcesPath = join(process.resourcesPath);

exports.getUserData = () => userData;
exports.getUserDataVersioned = () => userDataVersioned;

exports.getResources = () => resourcesPath;
exports.getModuleDataPath = () => moduleData;
exports.getInstallPath = () => installPath;

exports.getExeDir = () => exeDir;

exports.init = () => {}; // Stub as we setup on require

exports.cleanOldVersions = () => {
  if (!installPath) return;

  for (const x of fs.readdirSync(installPath)) {
    if (x.startsWith('app-') && !x.includes(buildInfo.version)) fs.rmSync(join(installPath, x), { recursive: true, force: true });
  }
};