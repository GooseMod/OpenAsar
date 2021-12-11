const { readFileSync, statSync, writeFileSync } = require('fs');
const { join } = require('path');

class Settings { // Heavily based on original for compat, but simplified and tweaked
  constructor(root) {
    this.path = join(root, 'settings.json');

    try {
      this.lastSaved = readFileSync(this.path);
      this.settings = JSON.parse(this.lastSaved);
    } catch (_e) {
      this.lastSaved = '';
      this.settings = {};
    }

    this.lastModified = this.getLastModified();

    log('AppSettings', 'Loaded settings.json with path', this.path, 'with settings', this.settings, 'and last modified', this.lastModified);
  }

  getLastModified() {
    try {
      return statSync(this.path).mtime.getTime();
    } catch (e) {
      return 0;
    }
  }

  get(key, defaultValue = false) {
    return this.settings[key] ?? defaultValue;
  }

  set(key, value) {
    this.settings[key] = value;
  }

  save() {
    if (this.lastModified && this.lastModified !== this.getLastModified()) { // File was last modified after Settings was made, so was externally edited therefore we don't save over
      log('AppSettings', 'Refusing to save settings.json due to last modified date mismatch');
      return;
    }

    try {
      const toSave = JSON.stringify(this.settings, null, 2);

      if (this.lastSaved != toSave) { // Settings has changed
        this.lastSaved = toSave;

        writeFileSync(this.path, toSave);

        this.lastModified = this.getLastModified();
      }

      log('AppSettings', 'Saved', this.path);
    } catch (e) {
      log('AppSettings', 'Failed to save', this.path, e);
    }
  }

}

module.exports = Settings;