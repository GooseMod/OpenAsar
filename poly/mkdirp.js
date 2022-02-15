// Minimal wrapper mimicking mkdirp package
const fs = require('fs');

const mk = (path, callback) => { // async
  fs.mkdir(path, { recursive: true }, () => callback()); // Never error
};

mk.sync = (path) => { // sync
  try {
    fs.mkdirSync(path, { recursive: true });
  } catch (e) { } // Never error
};

module.exports = mk;