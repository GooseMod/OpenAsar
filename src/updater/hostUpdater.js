const { app, autoUpdater } = require('electron');
const events = require('events');

const request = require('request');

const versionParse = (s) => s.split('.').map((x) => parseInt(x));
const versionNewer = (a, b) => a.some((x, i) => {
  const y = b[i];
  if (x == undefined) return false;
  if (y == undefined) return true;

  if (x === y) return undefined;
  return x > b[i];
});

class HostLinux extends events.EventEmitter {
  setFeedURL(url) {
    this.updateUrl = url;
  }

  quitAndInstall() {
    app.relaunch();
    app.quit();
  }

  async checkForUpdates() {
    const current = versionParse(app.getVersion());
    this.emit('checking-for-update');

    try {
      const res = await new Promise((res) => request.get(this.updateUrl, (_e, r) => res(r)));
      if (res.statusCode === 204) return this.emit('update-not-available');

      const latest = versionParse(JSON.parse(res.body).name);

      if (versionNewer(latest, current)) {
        log('HostLinux', 'Outdated');
        return this.emit('update-manually', latestVerStr);
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