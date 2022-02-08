const { app, autoUpdater } = require('electron');
const events = require('events');

const { get } = require('request');

const vParse = (s) => s.split('.').map((x) => parseInt(x));
const vNewer = (a, b) => a.some((x, i) => x === b[i] ? undefined : (x > b[i]));

class HostLinux extends events.EventEmitter {
  setFeedURL(url) {
    this.updateUrl = url;
  }

  quitAndInstall() {
    app.relaunch();
    app.quit();
  }

  async checkForUpdates() {
    const current = vParse(app.getVersion());
    this.emit('checking-for-update');

    try {
      const [ res, body ] = await new Promise((res) => get(this.updateUrl, (_e, r, b) => res([r, b])));
      if (res.statusCode === 204) return this.emit('update-not-available');

      const latest = vParse(JSON.parse(body).name);

      if (vNewer(latest, current)) {
        log('HostLinux', 'Outdated');
        return this.emit('update-manually', latest.join('.'));
      }

      log('HostLinux', 'Not outdated');
      this.emit('update-not-available');
    } catch (err) {
      log('HostLinux', 'Error', this.updateUrl, err.message);
      this.emit('error', err);
    }
  }
}


switch (process.platform) {
  case 'darwin':
    exports.default = autoUpdater;
    break;

  case 'linux':
    exports.default = new HostLinux();
    break;
}

module.exports = exports.default;