const { join, dirname, basename } = require('path');
const { app } = require('electron');

const buildInfo = require('./utils/buildInfo');


const appDir = 'discord' + (buildInfo.releaseChannel === 'stable' ? '' : buildInfo.releaseChannel); // Clean channel naming up later to util?
const userData = join(app.getPath('appData'), appDir);
const userDataVersioned = join(userData, buildInfo.version);

const exeDir = dirname(app.getPath('exe'));
const installPath = /^app-[0-9]+\.[0-9]+\.[0-9]+/.test(basename(exeDir)) ? join(exeDir, '..') : null;

const moduleData = buildInfo.newUpdater ? join(userData, 'module_data') : join(userDataVersioned, 'modules');
const resourcesPath = join(process.resourcesPath, '..'); // Discord uses path and require.main.filename here because ??

exports.getUserData = () => userData;
exports.getUserDataVersioned = () => userDataVersioned;

exports.getResources = () => resourcesPath;
exports.getModuleDataPath = () => moduleData;
exports.getInstallPath = () => installPath;

exports.getExeDir = () => exeDir; // Custom / non-standard

exports.init = () => {}; // Stub as we setup on require