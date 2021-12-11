// Stub for now at least, also retaining OpenAsar

const retainAsar = require('./retainAsar');

exports.install = (callback) => { callback(); };
exports.update = (callback) => {
  if (process.platform === 'win32') {
    try {
      retainAsar();
    } catch (e) {
      log('RetainAsar', 'Error', e);
    }
  }

  callback();
};
exports.uninstall = (callback) => { callback(); };
exports.isInstalled = (callback) => { callback(true); }; // Stub to true or false?