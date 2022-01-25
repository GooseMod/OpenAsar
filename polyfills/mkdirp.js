// Minimal wrapper mimicking mkdirp package
const fs = require('fs');

const mk = (path, callback) => { // async
  fs.mkdir(path, { recursive: true }, () => { // Already exists, ignore
    callback();
  });
};

mk.sync = (path) => { // sync
  try {
    fs.mkdirSync(path, { recursive: true });
  } catch (e) { } // Already exists, ignore
};

module.exports = mk;