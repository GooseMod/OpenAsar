// Minimal wrapper mimicking mkdirp package
const fs = require('fs');

const async = (path, callback) => { // async
  log('Mkdirp', 'Async:', path);

  fs.mkdir(path, { recursive: true }, () => { // Ignore errors (already exists)
    callback();
  });
};

const sync = (path) => { // sync
  log('Mkdirp', 'Sync:', path);

  try {
    fs.mkdirSync(path, { recursive: true });
  } catch (e) { } // Already exists, ignore
};

async.sync = sync;
module.exports = async;