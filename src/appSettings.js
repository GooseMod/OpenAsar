let settings;

exports.getSettings = () => {
  if (!settings) settings = new (require('./utils/Settings'))(require('./paths').getUserData());
  return settings;
};
exports.init = () => {};