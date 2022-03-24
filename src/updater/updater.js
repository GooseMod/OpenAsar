const { spawn } = require('child_process');
const { app } = require('electron');
const { EventEmitter } = require('events');
const Module = require('module');
const { join, resolve, basename } = require('path');
const { hrtime } = require('process');

const paths = require('../paths');

let instance;
const TASK_STATE_COMPLETE = 'Complete';
const TASK_STATE_FAILED = 'Failed';
const TASK_STATE_WAITING = 'Waiting';
const TASK_STATE_WORKING = 'Working';
const INCONSISTENT_INSTALLER_STATE_ERROR = 'InconsistentInstallerState';

const INVALID_UPDATER_ERROR = "Can't send request to updater because the native updater isn't loaded.";


class Updater extends EventEmitter {
  constructor(options) {
    super();

    let nativeUpdaterModule;
    try {
      nativeUpdaterModule = options.nativeUpdaterModule ?? require(paths.getExeDir() + '/updater');
    } catch (e) {
      log('Updater', 'Require fail', e);

      if (e.code === 'MODULE_NOT_FOUND') return;
      throw e;
    }

    this.committedHostVersion = null;
    this.rootPath = options.root_path;
    this.nextRequestId = 0;
    this.requests = new Map();
    this.updateEventHistory = [];
    this.isRunningInBackground = false;
    this.currentlyDownloading = {};
    this.currentlyInstalling = {};
    this.hasEmittedUnhandledException = false;

    this.nativeUpdater = new nativeUpdaterModule.Updater({
      response_handler: this._handleResponse.bind(this),
      ...options
    });
  }

  get valid() {
    return this.nativeUpdater != null;
  }

  _sendRequest(detail, progressCallback = null) {
    if (!this.valid) throw new Error(INVALID_UPDATER_ERROR);

    const requestId = this.nextRequestId++;
    return new Promise((resolve, reject) => {
      this.requests.set(requestId, {
        resolve,
        reject,
        progressCallback
      });
      this.nativeUpdater.command(JSON.stringify([requestId, detail]));
    });
  }

  _sendRequestSync(detail) {
    if (!this.valid) {
      throw new Error(INVALID_UPDATER_ERROR);
    }

    const requestId = this.nextRequestId++;
    return this.nativeUpdater.command_blocking(JSON.stringify([requestId, detail]));
  }

  _handleResponse(response) {
    try {
      const [id, detail] = JSON.parse(response);
      const request = this.requests.get(id);

      if (request == null) return log('Updater', 'Unknown resp', id, detail);

      if (detail['Error'] != null) {
        const {
          kind,
          details,
          severity
        } = detail['Error'];
        const e = new Error(`(${kind}) ${details}`);

        if (severity === 'Fatal') {
          const handled = this.emit(kind, e);

          if (!handled) {
            throw e;
          }
        } else {
          this.emit('update-error', e);
          request.reject(e);
          this.requests.delete(id);
        }
      } else if (detail === 'Ok') {
        request.resolve();
        this.requests.delete(id);
      } else if (detail['VersionInfo'] != null) {
        request.resolve(detail['VersionInfo']);
        this.requests.delete(id);
      } else if (detail['ManifestInfo'] != null) {
        request.resolve(detail['ManifestInfo']);
        this.requests.delete(id);
      } else if (detail['TaskProgress'] != null) {
        const msg = detail['TaskProgress'];
        const progress = {
          task: msg[0],
          state: msg[1],
          percent: msg[2],
          bytesProcessed: msg[3]
        };

        this._recordTaskProgress(progress);

        if (request.progressCallback != null) {
          request.progressCallback(progress);
        }

        if (progress.task['HostInstall'] != null && progress.state === TASK_STATE_COMPLETE) {
          this.emit('host-updated');
        }
      } else {
        log('Updater', 'Unknown resp', id, detail);
      }
    } catch (e) {
      log('Updater', 'Handler excepetion', e);

      if (!this.hasEmittedUnhandledException) {
        this.hasEmittedUnhandledException = true;
        this.emit('unhandled-exception', e);
      }
    }
  }

  _handleSyncResponse(response) {
    const detail = JSON.parse(response);

    if (detail['Error'] != null) {
      throw new Error(detail['Error']);
    } else if (detail === 'Ok') {
      return;
    } else if (detail['VersionInfo'] != null) {
      return detail['VersionInfo'];
    }

    log('Updater', 'Unknown resp', detail);
  }

  _getHostPath() {
    return join(this.rootPath, `app-${this.committedHostVersion.join('.')}`);
  }

  _startCurrentVersionInner(options, versions) {
    if (this.committedHostVersion == null) this.committedHostVersion = versions.current_host;

    const hostPath = this._getHostPath();

    const hostExePath = join(hostPath, basename(process.execPath));

    if (resolve(hostExePath) != resolve(process.execPath) && !(options === null || options === void 0 ? void 0 : options.allowObsoleteHost)) {
      app.once('will-quit', () => {
        spawn(hostExePath, [], {
          detached: true,
          stdio: 'inherit'
        });
      });

      log('Updater', 'Restarting', resolve(process.execPath), '->', resolve(hostExePath));
      return app.quit();
    }

    this._commitModulesInner(versions);
  }

  _commitModulesInner(versions) {
    const base = join(this._getHostPath(), 'modules');

    for (const mod in versions.current_modules) {
      const path = join(modulesPath, `${mod}-${versions.current_modules[mod]}`);

      if (!Module.globalPaths.includes(path)) Module.globalPaths.push(path);
    }
  }

  _recordDownloadProgress(name, progress) {
    const now = String(hrtime.bigint());

    if (progress.state === TASK_STATE_WORKING && !this.currentlyDownloading[name]) {
      this.currentlyDownloading[name] = true;
      this.updateEventHistory.push({
        type: 'downloading-module',
        name: name,
        now: now
      });
    } else if (progress.state === TASK_STATE_COMPLETE || progress.state === TASK_STATE_FAILED) {
      this.currentlyDownloading[name] = false;
      this.updateEventHistory.push({
        type: 'downloaded-module',
        name: name,
        now: now,
        succeeded: progress.state === TASK_STATE_COMPLETE,
        receivedBytes: progress.bytesProcessed
      });
    }
  }

  _recordInstallProgress(name, progress, newVersion, isDelta) {
    const now = String(hrtime.bigint());

    if (progress.state === TASK_STATE_WORKING && !this.currentlyInstalling[name]) {
      this.currentlyInstalling[name] = true;
      this.updateEventHistory.push({
        type: 'installing-module',
        name,
        now,
        newVersion,
        foreground: !this.isRunningInBackground
      });
    } else if (progress.state === TASK_STATE_COMPLETE || progress.state === TASK_STATE_FAILED) {
      this.currentlyInstalling[name] = false;
      this.updateEventHistory.push({
        type: 'installed-module',
        name,
        now,
        newVersion,
        succeeded: progress.state === TASK_STATE_COMPLETE,
        delta: isDelta,
        foreground: !this.isRunningInBackground
      });
    }
  }

  _recordTaskProgress(progress) {
    if (progress.task.HostDownload != null) this._recordDownloadProgress('host', progress);
      else if (progress.task.HostInstall != null) this._recordInstallProgress('host', progress, null, progress.task.HostInstall.from_version != null);
      else if (progress.task.ModuleDownload != null) this._recordDownloadProgress(progress.task.ModuleDownload.version.module.name, progress);
      else if (progress.task.ModuleInstall != null) this._recordInstallProgress(progress.task.ModuleInstall.version.module.name, progress, progress.task.ModuleInstall.version.version, progress.task.ModuleInstall.from_version != null);
  }

  queryCurrentVersions() {
    return this._sendRequest('QueryCurrentVersions');
  }

  queryCurrentVersionsSync() {
    return this._handleSyncResponse(this._sendRequestSync('QueryCurrentVersions'));
  }

  repair(progressCallback) {
    return this.repairWithOptions(null, progressCallback);
  }

  repairWithOptions(options, progressCallback) {
    return this._sendRequest({
      Repair: {
        options
      }
    }, progressCallback);
  }

  collectGarbage() {
    return this._sendRequest('CollectGarbage');
  }

  setRunningManifest(manifest) {
    return this._sendRequest({
      SetManifests: ['Running', manifest]
    });
  }

  setPinnedManifestSync(manifest) {
    return this._handleSyncResponse(this._sendRequestSync({
      SetManifests: ['Pinned', manifest]
    }));
  }

  installModule(name, progressCallback) {
    return this.installModuleWithOptions(name, null, progressCallback);
  }

  installModuleWithOptions(name, options, progressCallback) {
    return this._sendRequest({
      InstallModule: {
        name,
        options
      }
    }, progressCallback);
  }

  updateToLatest(progressCallback) {
    return this.updateToLatestWithOptions(null, progressCallback);
  }

  updateToLatestWithOptions(options, progressCallback) {
    return this._sendRequest({
      UpdateToLatest: {
        options
      }
    }, progressCallback);
  }


  async startCurrentVersion(options) {
    const versions = await this.queryCurrentVersions();
    await this.setRunningManifest(versions.last_successful_update);

    this._startCurrentVersionInner(options, versions);
  }

  startCurrentVersionSync(options) {
    const versions = this.queryCurrentVersionsSync();

    this._startCurrentVersionInner(options, versions);
  }

  async commitModules(versions) {
    if (this.committedHostVersion == null) throw new Error('Cannot commit modules before host version.');

    this._commitModulesInner(versions ?? await this.queryCurrentVersions());
  }

  setRunningInBackground() {
    this.isRunningInBackground = true;
  }

  queryAndTruncateHistory() {
    const history = this.updateEventHistory;
    this.updateEventHistory = [];
    return history;
  }

  getKnownFolder(name) {
    if (!this.valid) throw new Error(INVALID_UPDATER_ERROR);

    return this.nativeUpdater.known_folder(name);
  }

  createShortcut(options) {
    if (!this.valid) throw new Error(INVALID_UPDATER_ERROR);

    return this.nativeUpdater.create_shortcut(options);
  }

}


module.exports = {
  Updater,
  TASK_STATE_COMPLETE,
  TASK_STATE_FAILED,
  TASK_STATE_WAITING,
  TASK_STATE_WORKING,
  INCONSISTENT_INSTALLER_STATE_ERROR,

  tryInitUpdater: (buildInfo, repository_url) => {
    const root_path = paths.getInstallPath();
    if (root_path == null) return false;
  
    let platform = process.platform;
    switch (platform) {
      case 'darwin':
        platform = 'osx';
        break;
  
      case 'win32':
        platform = 'win';
        break;
    }
  
    instance = new Updater({
      release_channel: buildInfo.releaseChannel,
      platform,
      repository_url,
      root_path
    });
  
    return instance.valid;
  },

  getUpdater: () => (instance != null && instance.valid && instance) || null
};