const { app, autoUpdater } = require('electron');

const { get } = require('request');


module.exports = process.platform === 'linux' ? new (class HostLinux extends require('events').EventEmitter {
  setFeedURL(url) {
    this.url = url;
  }

  quitAndInstall() {
    app.relaunch();
    app.quit();
  }

  async checkForUpdates() {
    get(this.url, (e, r, b) => {
      if (e) return this.emit('error');

      if (r.statusCode === 204) return this.emit('update-not-available');

      this.emit('update-manually', b);
    });
  }
})() : autoUpdater;