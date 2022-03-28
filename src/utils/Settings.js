const fs = require('fs');
const { join } = require('path');

module.exports = class Settings { // Heavily based on original for compat, but simplified and tweaked
  constructor(root) {
    this.path = join(root, 'settings.json');

    try {
      this.settings = JSON.parse(fs.readFileSync(this.path));
    } catch (e) {
      this.settings = {};
    }

    this.mod = this.getMod();

    log('AppSettings', this.path, this.settings);
  }

  getMod() { // Get when file was last modified
    try {
      return fs.statSync(this.path).mtime.getTime();
    } catch (e) {
      return 0;
    }
  }

  get(key, defaultValue) {
    return this.settings[key] ?? defaultValue;
  }

  set(key, value) {
    this.settings[key] = value;
  }

  save() {
    if (this.mod && this.mod !== this.getMod()) return; // File was last modified after Settings was made, so was externally edited therefore we don't save over

    try {
      const str = JSON.stringify(this.settings, null, 2);

      fs.writeFileSync(this.path, str);
      this.mod = this.getMod();

      log('AppSettings', 'Saved');
    } catch (e) {
      log('AppSettings', e);
    }
  }
}