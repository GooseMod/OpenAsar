const { join, dirname } = require('path');
const { app } = require('electron');

const buildInfo = require('./utils/buildInfo');

const userData = join(app.getPath('appData'), 'discord' + (buildInfo.releaseChannel === 'stable' ? '' : buildInfo.releaseChannel));

global.moduleDataPath = join(userData, 'module_data'); // Global because discord
app.setPath('userData', userData); // Set userData properly because electron


exports.getUserData = () => userData;
exports.getExeDir = () => dirname(app.getPath('exe'));