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
    this.emit('checking-for-update');

    try {
      const current = vParse(app.getVersion());

      get(this.updateUrl, (err, res, body) => {
        if (err) return this.emit('error');
        if (res.statusCode === 204) return this.emit('update-not-available');

        const latest = vParse(JSON.parse(body).name);
        if (vNewer(latest, current)) return this.emit('update-manually', latest.join('.'));

        this.emit('update-not-available');
      });
    } catch (e) {
      log('HostLinux', 'Error', e);
      this.emit('error');
    }
  }
}


switch (process.platform) {
  case 'darwin':
    module.exports = autoUpdater;
    break;

  case 'linux':
    module.exports = new HostLinux();
    break;
}