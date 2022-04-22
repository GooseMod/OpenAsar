const { autoUpdater } = require('electron');

const { get } = require('request');


module.exports = process.platform === 'linux' ? new (class HostLinux extends require('events').EventEmitter {
  setFeedURL(url) {
    this.url = url;
  }

  checkForUpdates() {
    get(this.url, (e, r, b) => {
      if (e) return this.emit('error');

      if (r.statusCode === 204) return this.emit('update-not-available');

      this.emit('update-manually', b);
    });
  }
})() : autoUpdater;