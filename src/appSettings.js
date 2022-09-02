const fs = require('fs');

const path = require('path').join(require('electron').app.getPath('userData'), 'settings.json');

const getMod = () => { try {
  return fs.statSync(this.path).mtime.getTime();
} catch { } };

let mod = getMod();

let store = {};
try {
  store = JSON.parse(fs.readFileSync(path));
} catch { }

log('Settings', path, store);


exports.getSettings = () => ({
  getMod,

  get: (k, d) => store[k] ?? d,
  set: (k, v) => store[k] = v,

  save: () => {
    if (this.mod && this.mod !== this.getMod()) return; // file has been modified externally, so don't overwrite

    try {
      fs.writeFileSync(path, JSON.stringify(store, null, 2));
      mod = getMod();

      log('Settings', 'Saved');
    } catch (e) {
      log('Settings', e);
    }
  }
})