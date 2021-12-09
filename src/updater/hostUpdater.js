"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _electron = require("electron");

var _events = require("events");

var _request = _interopRequireDefault(require("./request"));

var squirrelUpdate = _interopRequireWildcard(require("./squirrelUpdate"));

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function versionParse(verString) {
  return verString.split('.').map(i => parseInt(i));
}

function versionNewer(verA, verB) {
  let i = 0;

  while (true) {
    const a = verA[i];
    const b = verB[i];
    i++;

    if (a === undefined) {
      return false;
    } else {
      if (b === undefined || a > b) {
        return true;
      }

      if (a < b) {
        return false;
      }
    }
  }
}

class AutoUpdaterWin32 extends _events.EventEmitter {
  constructor() {
    super();
    this.updateUrl = null;
    this.updateVersion = null;
  }

  setFeedURL(updateUrl) {
    this.updateUrl = updateUrl;
  }

  quitAndInstall() {
    if (squirrelUpdate.updateExistsSync()) {
      squirrelUpdate.restart(_electron.app, this.updateVersion || _electron.app.getVersion());
    } else {
      require('auto-updater').quitAndInstall();
    }
  }

  downloadAndInstallUpdate(callback) {
    squirrelUpdate.spawnUpdateInstall(this.updateUrl, progress => {
      this.emit('update-progress', progress);
    }).catch(err => callback(err)).then(() => callback());
  }

  checkForUpdates() {
    if (this.updateUrl == null) {
      throw new Error('Update URL is not set');
    }

    this.emit('checking-for-update');

    if (!squirrelUpdate.updateExistsSync()) {
      this.emit('update-not-available');
      return;
    }

    squirrelUpdate.spawnUpdate(['--check', this.updateUrl], (error, stdout) => {
      if (error != null) {
        this.emit('error', error);
        return;
      }

      try {
        // Last line of the output is JSON details about the releases
        const json = stdout.trim().split('\n').pop();
        const releasesFound = JSON.parse(json).releasesToApply;

        if (releasesFound == null || releasesFound.length == 0) {
          this.emit('update-not-available');
          return;
        }

        const update = releasesFound.pop();
        this.emit('update-available');
        this.downloadAndInstallUpdate(error => {
          if (error != null) {
            this.emit('error', error);
            return;
          }

          this.updateVersion = update.version;
          this.emit('update-downloaded', {}, update.release, update.version, new Date(), this.updateUrl, this.quitAndInstall.bind(this));
        });
      } catch (error) {
        error.stdout = stdout;
        this.emit('error', error);
      }
    });
  }

} // todo


class AutoUpdaterLinux extends _events.EventEmitter {
  constructor() {
    super();
    this.updateUrl = null;
  }

  setFeedURL(url) {
    this.updateUrl = url;
  }

  quitAndInstall() {
    // Just restart. The splash screen will hit the update manually state and
    // prompt the user to download the new package.
    _electron.app.relaunch();

    _electron.app.quit();
  }

  async checkForUpdates() {
    const currVersion = versionParse(_electron.app.getVersion());
    this.emit('checking-for-update');

    try {
      const response = await _request.default.get(this.updateUrl);

      if (response.statusCode === 204) {
        // you are up to date
        this.emit('update-not-available');
        return;
      }

      let latestVerStr = '';
      let latestVersion = [];

      try {
        const latestMetadata = JSON.parse(response.body);
        latestVerStr = latestMetadata.name;
        latestVersion = versionParse(latestVerStr);
      } catch (_) {}

      if (versionNewer(latestVersion, currVersion)) {
        console.log('[Updates] You are out of date!'); // you need to update

        this.emit('update-manually', latestVerStr);
      } else {
        console.log('[Updates] You are living in the future!');
        this.emit('update-not-available');
      }
    } catch (err) {
      console.error('[Updates] Error fetching ' + this.updateUrl + ': ' + err.message);
      this.emit('error', err);
    }
  }

}

let autoUpdater; // TODO
// events: checking-for-update, update-available, update-not-available, update-manually, update-downloaded, error
// also, checkForUpdates, setFeedURL, quitAndInstall
// also, see electron.autoUpdater, and its API

switch (process.platform) {
  case 'darwin':
    autoUpdater = require('electron').autoUpdater;
    break;

  case 'win32':
    autoUpdater = new AutoUpdaterWin32();
    break;

  case 'linux':
    autoUpdater = new AutoUpdaterLinux();
    break;
}

var _default = autoUpdater;
exports.default = _default;
module.exports = exports.default;