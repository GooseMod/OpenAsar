// Minimal wrapper mimicking mkdirp package

exports.__esModule = true; // Makes moduleUpdater internals load properly

const fs = require('fs');


const async = (path, callback) => { // async
  log('Mkdirp', 'Async:', path);

  try {
    fs.mkdir(path, callback, { recursive: true });
  } catch (e) { } // Doesn't exist, ignore
};

const sync = (path) => { // sync
  log('Mkdirp', 'Sync:', path);

  try {
    fs.mkdirSync(path, { recursive: true });
  } catch (e) { } // Doesn't exist, ignore
};

const toExport = async;
toExport.sync = sync;

exports.default = toExport;