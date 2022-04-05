const fs = require('fs');

class Settings { // Heavily based on original for compat, but simplified and tweaked
  constructor(path) {
    this.path = path;

    try {
      this.store = JSON.parse(fs.readFileSync(this.path));
    } catch (e) {
      this.store = {};
    }

    this.mod = this.getMod();

    log('AppSettings', this.path, this.store);
  }

  getMod() { // Get when file was last modified
    try {
      return fs.statSync(this.path).mtime.getTime();
    } catch { }
  }

  get(key, defaultValue) {
    return this.store[key] ?? defaultValue;
  }

  set(key, value) {
    this.store[key] = value;
  }

  save() {
    if (this.mod && this.mod !== this.getMod()) return; // File was last modified after Settings was made, so was externally edited therefore we don't save over

    try {
      fs.writeFileSync(this.path, JSON.stringify(this.store, null, 2));
      this.mod = this.getMod();

      log('AppSettings', 'Saved');
    } catch (e) {
      log('AppSettings', e);
    }
  }
}

let inst; // Instance of class
exports.getSettings = () => inst = inst ?? new Settings(require('path').join(require('./paths').getUserData(), 'settings.json'));