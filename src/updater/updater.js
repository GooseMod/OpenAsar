const { spawn } = require('child_process');
const { app } = require('electron');
const Module = require('module');
const { join, resolve, basename } = require('path');
const { hrtime } = require('process');

const paths = require('../paths');

let instance;
const TASK_STATE_COMPLETE = 'Complete';
const TASK_STATE_FAILED = 'Failed';
const TASK_STATE_WAITING = 'Waiting';
const TASK_STATE_WORKING = 'Working';

// discord made breaking changes without any api versioning wow!!
// so we have to read the node module to determine the version
let updaterVersion = 1;
const updaterPath = paths.getExeDir() + '/updater.node';

class Updater extends require('events').EventEmitter {
  constructor(options) {
    super();

    let Native;
    try {
      Native = options.nativeUpdaterModule ?? require(updaterPath);
    } catch (e) {
      log('Updater', e); // Error when requiring

      if (e.code === 'MODULE_NOT_FOUND') return;
      throw e;
    }

    this.committedHostVersion = null;
    this.rootPath = options.root_path;
    this.nextRequestId = 0;
    this.requests = new Map();
    this.updateEventHistory = [];
    this.currentlyDownloading = {};
    this.currentlyInstalling = {};
    this.hasEmittedUnhandledException = false;

    this.nativeUpdater = new Native.Updater({
      response_handler: this._handleResponse.bind(this),
      ...options
    });
  }

  get valid() {
    return this.nativeUpdater != null;
  }

  _sendRequest(detail, progressCallback = null) {
    if (!this.valid) throw 'No native';

    const requestId = this.nextRequestId++;
    return new Promise((resolve, reject) => {
      this.requests.set(requestId, {
        resolve,
        reject,
        progressCallback
      });

      this.nativeUpdater.command(JSON.stringify([ requestId, detail ]));
    });
  }

  _sendRequestSync(detail) {
    if (!this.valid) throw 'No native';

    return this.nativeUpdater.command_blocking(JSON.stringify([ this.nextRequestId++, detail ]));
  }

  _handleResponse(response) {
    try {
      const [ id, detail ] = JSON.parse(response);
      const request = this.requests.get(id);

      if (request == null) return log('Updater', id, detail); // No request handlers for id / type

      if (detail['Error'] != null) {
        const {
          kind,
          details,
          severity
        } = detail['Error'];
        const e = new Error(`(${kind}) ${details}`);

        if (severity === 'Fatal') {
          if (!this.emit(kind, e)) throw e;
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

        request.progressCallback?.(progress);

        if (progress.task['HostInstall'] != null && progress.state === TASK_STATE_COMPLETE) this.emit('host-updated');
      } else log('Updater', id, detail); // Unknown response
    } catch (e) {
      log('Updater', e); // Error handling response

      if (!this.hasEmittedUnhandledException) {
        this.hasEmittedUnhandledException = true;
        this.emit('unhandled-exception', e);
      }
    }
  }

  _handleSyncResponse(response) {
    const detail = JSON.parse(response);

    if (detail.Error != null) throw detail.Error;
      else if (detail === 'Ok') return;
      else if (detail.VersionInfo != null) return detail.VersionInfo;

    log('Updater', detail); // Unknown response
  }

  _getHostPath() {
    return join(this.rootPath, `app-${this.committedHostVersion.join('.')}`);
  }

  _startCurrentVersionInner(options, versions) {
    if (this.committedHostVersion == null) this.committedHostVersion = versions.current_host;

    const cur = resolve(process.execPath);
    const next = resolve(join(this._getHostPath(), basename(process.execPath)));

    if (next != cur && !options?.allowObsoleteHost) {
      // Retain OpenAsar
      const fs = require('original-fs');

      const cAsar = join(require.main.filename, '..');
      const nAsar = join(next, '..', 'resources', 'app.asar');

      try {
        fs.copyFileSync(nAsar, nAsar + '.backup'); // Copy new app.asar to backup file (<new>/app.asar -> <new>/app.asar.backup)
        fs.copyFileSync(cAsar, nAsar); // Copy old app.asar to new app.asar (<old>/app.asar -> <new>/app.asar)
      } catch (e) {
        log('Updater', 'Failed to retain OpenAsar', e);
      }

      app.once('will-quit', () => spawn(next, [], {
        detached: true,
        stdio: 'inherit'
      }));

      log('Updater', 'Restarting', next);
      return app.quit();
    }

    this._commitModulesInner(versions);
  }

  _commitModulesInner(versions) {
    const base = join(this._getHostPath(), 'modules');

    for (const m in versions.current_modules) Module.globalPaths.unshift(join(base, `${m}-${versions.current_modules[m]}`));
  }

  _recordDownloadProgress(name, progress) {
    const now = String(hrtime.bigint());

    if (progress.state === TASK_STATE_WORKING && !this.currentlyDownloading[name]) {
      this.currentlyDownloading[name] = true;
      this.updateEventHistory.push({
        type: 'downloading-module',
        name,
        now
      });
    } else if (progress.state === TASK_STATE_COMPLETE || progress.state === TASK_STATE_FAILED) {
      this.currentlyDownloading[name] = false;
      this.updateEventHistory.push({
        type: 'downloaded-module',
        name,
        now,
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
        newVersion
      });
    } else if (progress.state === TASK_STATE_COMPLETE || progress.state === TASK_STATE_FAILED) {
      this.currentlyInstalling[name] = false;
      this.updateEventHistory.push({
        type: 'installed-module',
        name,
        now,
        newVersion,
        succeeded: progress.state === TASK_STATE_COMPLETE,
        delta: isDelta
      });
    }
  }

  _recordTaskProgress(progress) {
    if (progress.task.HostDownload != null) this._recordDownloadProgress('host', progress);
      else if (progress.task.HostInstall != null) this._recordInstallProgress('host', progress, null, progress.task.HostInstall.from_version != null);
      else if (progress.task.ModuleDownload != null) this._recordDownloadProgress(progress.task.ModuleDownload.version.module.name, progress);
      else if (progress.task.ModuleInstall != null) this._recordInstallProgress(progress.task.ModuleInstall.version.module.name, progress, progress.task.ModuleInstall.version.version, progress.task.ModuleInstall.from_version != null);
  }

  constructQueryCurrentVersionsRequest(options) {
    if (updaterVersion === 1) return 'QueryCurrentVersions';

    return {
      QueryCurrentVersions: {
        options
      }
    };
  }

  queryCurrentVersionsWithOptions(options) {
    return this._sendRequest(this.constructQueryCurrentVersionsRequest(options));
  }
  queryCurrentVersions() {
    return this.queryCurrentVersionsWithOptions(null);
  }

  queryCurrentVersionsWithOptionsSync(options) {
    return this._handleSyncResponse(this._sendRequestSync(this.constructQueryCurrentVersionsRequest(options)));
  }
  queryCurrentVersionsSync() {
    return this.queryCurrentVersionsWithOptionsSync(null);
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


  async startCurrentVersion(queryOptions, options) {
    const versions = await this.queryCurrentVersionsWithOptions(queryOptions);
    await this.setRunningManifest(versions.last_successful_update);

    this._startCurrentVersionInner(options, versions);
  }

  startCurrentVersionSync(options) {
    this._startCurrentVersionInner(options, this.queryCurrentVersionsSync());
  }

  async commitModules(queryOptions, versions) {
    if (this.committedHostVersion == null) throw 'No host';

    this._commitModulesInner(versions ?? await this.queryCurrentVersionsWithOptions(queryOptions));
  }

  queryAndTruncateHistory() {
    const history = this.updateEventHistory;
    this.updateEventHistory = [];
    return history;
  }

  getKnownFolder(name) {
    if (!this.valid) throw 'No native';

    return this.nativeUpdater.known_folder(name);
  }

  createShortcut(options) {
    if (!this.valid) throw 'No native';

    return this.nativeUpdater.create_shortcut(options);
  }
}


module.exports = {
  Updater,
  TASK_STATE_COMPLETE,
  TASK_STATE_FAILED,
  TASK_STATE_WAITING,
  TASK_STATE_WORKING,

  INCONSISTENT_INSTALLER_STATE_ERROR: 'InconsistentInstallerState',

  tryInitUpdater: (buildInfo, repository_url) => {
    const root_path = paths.getInstallPath();
    if (root_path == null) return false;

    const updaterContents = require('fs').readFileSync(updaterPath, 'utf8');
    if (updaterContents.includes('Determined this is an architecture transition')) updaterVersion = 2;

    log('Updater', 'Determined native module version', updaterVersion);

    instance = new Updater({
      release_channel: buildInfo.releaseChannel,
      platform: process.platform === 'win32' ? 'win' : 'osx',
      repository_url,
      root_path,
      user_data_path: paths.getUserData(),
      current_os_arch: process.platform === 'win32' ? (['AMD64', 'IA64'].includes(process.env.PROCESSOR_ARCHITEW6432 ?? process.env.PROCESSOR_ARCHITECTURE) ? 'x64' : 'x86') : null
    });

    return instance.valid;
  },

  getUpdater: () => (instance != null && instance.valid && instance) || null
};