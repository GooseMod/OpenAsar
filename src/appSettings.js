const Settings = require('./utils/Settings');
const paths = require('./paths');

const settings = new Settings(paths.getUserData());

exports.getSettings = () => settings;
exports.init = () => {}; // Stub as we setup on require