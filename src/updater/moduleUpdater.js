"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.initPathsOnly = initPathsOnly;
exports.init = init;
exports.checkForUpdates = checkForUpdates;
exports.setInBackground = setInBackground;
exports.quitAndInstallUpdates = quitAndInstallUpdates;
exports.isInstalled = isInstalled;
exports.getInstalled = getInstalled;
exports.install = install;
exports.installPendingUpdates = installPendingUpdates;
exports.supportsEventObjects = exports.events = exports.NO_PENDING_UPDATES = exports.INSTALLING_MODULE_PROGRESS = exports.INSTALLING_MODULE = exports.INSTALLING_MODULES_FINISHED = exports.DOWNLOADED_MODULE = exports.UPDATE_MANUALLY = exports.DOWNLOADING_MODULES_FINISHED = exports.DOWNLOADING_MODULE_PROGRESS = exports.DOWNLOADING_MODULE = exports.UPDATE_CHECK_FINISHED = exports.INSTALLED_MODULE = exports.CHECKING_FOR_UPDATES = void 0;

var _fs = _interopRequireDefault(require("fs"));

var _path = _interopRequireDefault(require("path"));

var _module = _interopRequireDefault(require("module"));

var _events = require("events");

var _mkdirp = _interopRequireDefault(require("mkdirp"));

var _process = require("process");

var _yauzl = _interopRequireDefault(require("yauzl"));

var _Backoff = _interopRequireDefault(require("../utils/Backoff"));

var paths = _interopRequireWildcard(require("../paths"));

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Manages additional module installation and management.
// We add the module folder path to require() lookup paths here.
// undocumented node API
const originalFs = require('original-fs'); // events


const CHECKING_FOR_UPDATES = 'checking-for-updates';
exports.CHECKING_FOR_UPDATES = CHECKING_FOR_UPDATES;
const INSTALLED_MODULE = 'installed-module';
exports.INSTALLED_MODULE = INSTALLED_MODULE;
const UPDATE_CHECK_FINISHED = 'update-check-finished';
exports.UPDATE_CHECK_FINISHED = UPDATE_CHECK_FINISHED;
const DOWNLOADING_MODULE = 'downloading-module';
exports.DOWNLOADING_MODULE = DOWNLOADING_MODULE;
const DOWNLOADING_MODULE_PROGRESS = 'downloading-module-progress';
exports.DOWNLOADING_MODULE_PROGRESS = DOWNLOADING_MODULE_PROGRESS;
const DOWNLOADING_MODULES_FINISHED = 'downloading-modules-finished';
exports.DOWNLOADING_MODULES_FINISHED = DOWNLOADING_MODULES_FINISHED;
const UPDATE_MANUALLY = 'update-manually';
exports.UPDATE_MANUALLY = UPDATE_MANUALLY;
const DOWNLOADED_MODULE = 'downloaded-module';
exports.DOWNLOADED_MODULE = DOWNLOADED_MODULE;
const INSTALLING_MODULES_FINISHED = 'installing-modules-finished';
exports.INSTALLING_MODULES_FINISHED = INSTALLING_MODULES_FINISHED;
const INSTALLING_MODULE = 'installing-module';
exports.INSTALLING_MODULE = INSTALLING_MODULE;
const INSTALLING_MODULE_PROGRESS = 'installing-module-progress';
exports.INSTALLING_MODULE_PROGRESS = INSTALLING_MODULE_PROGRESS;
const NO_PENDING_UPDATES = 'no-pending-updates'; // settings

exports.NO_PENDING_UPDATES = NO_PENDING_UPDATES;
const ALWAYS_ALLOW_UPDATES = 'ALWAYS_ALLOW_UPDATES';
const SKIP_HOST_UPDATE = 'SKIP_HOST_UPDATE';
const SKIP_MODULE_UPDATE = 'SKIP_MODULE_UPDATE';
const ALWAYS_BOOTSTRAP_MODULES = 'ALWAYS_BOOTSTRAP_MODULES';
const USE_LOCAL_MODULE_VERSIONS = 'USE_LOCAL_MODULE_VERSIONS';

class Events extends _events.EventEmitter {
  constructor() {
    super();
    this.history = [];
  }

  append(evt) {
    evt.now = String(_process.hrtime.bigint());

    if (this._eventIsInteresting(evt)) {
      this.history.push(evt);
    }

    process.nextTick(() => this.emit(evt.type, evt));
  }

  _eventIsInteresting(evt) {
    return evt.type !== DOWNLOADING_MODULE_PROGRESS && evt.type !== INSTALLING_MODULE_PROGRESS;
  }

}

class LogStream {
  constructor(logPath) {
    try {
      this.logStream = _fs.default.createWriteStream(logPath, {
        flags: 'a'
      });
    } catch (e) {
      console.error(`Failed to create ${logPath}: ${String(e)}`);
    }
  }

  log(message) {
    message = `[Modules] ${message}`;
    console.log(message);

    if (this.logStream) {
      this.logStream.write(message);
      this.logStream.write('\r\n');
    }
  }

  end() {
    if (this.logStream) {
      this.logStream.end();
      this.logStream = null;
    }
  }

}

const request = require('./request');

const REQUEST_TIMEOUT = 15000;
const backoff = new _Backoff.default(1000, 20000);
const events = new Events();
exports.events = events;
const supportsEventObjects = true;
exports.supportsEventObjects = supportsEventObjects;
let logger;
let locallyInstalledModules;
let moduleInstallPath;
let installedModulesFilePath;
let moduleDownloadPath;
let bootstrapping;
let hostUpdater;
let hostUpdateAvailable;
let skipHostUpdate;
let skipModuleUpdate;
let checkingForUpdates;
let remoteBaseURL;
let remoteQuery;
let settings;
let remoteModuleVersions;
let installedModules;
let download;
let unzip;
let newInstallInProgress;
let localModuleVersionsFilePath;
let updatable;
let bootstrapManifestFilePath;
let runningInBackground = false;

function initPathsOnly(_buildInfo) {
  if (locallyInstalledModules || moduleInstallPath) {
    return;
  } // If we have `localModulesRoot` in our buildInfo file, we do not fetch modules
  // from remote, and rely on our locally bundled ones.
  // Typically used for development mode, or private builds.


  locallyInstalledModules = _buildInfo.localModulesRoot != null;

  if (locallyInstalledModules) {
    if (_module.default.globalPaths.indexOf(_buildInfo.localModulesRoot) === -1) {
      _module.default.globalPaths.push(_buildInfo.localModulesRoot);
    }
  } else {
    moduleInstallPath = _path.default.join(paths.getUserDataVersioned(), 'modules');

    if (_module.default.globalPaths.indexOf(moduleInstallPath) === -1) {
      _module.default.globalPaths.push(moduleInstallPath);
    }
  }
}

function init(_endpoint, _settings, _buildInfo) {
  const endpoint = _endpoint;
  settings = _settings;
  const buildInfo = _buildInfo;
  updatable = buildInfo.version != '0.0.0' && !buildInfo.debug || settings.get(ALWAYS_ALLOW_UPDATES);
  initPathsOnly(buildInfo);
  logger = new LogStream(_path.default.join(paths.getUserData(), 'modules.log'));
  bootstrapping = false;
  hostUpdateAvailable = false;
  checkingForUpdates = false;
  skipHostUpdate = settings.get(SKIP_HOST_UPDATE) || !updatable;
  skipModuleUpdate = settings.get(SKIP_MODULE_UPDATE) || locallyInstalledModules || !updatable;
  localModuleVersionsFilePath = _path.default.join(paths.getUserData(), 'local_module_versions.json');
  bootstrapManifestFilePath = _path.default.join(paths.getResources(), 'bootstrap', 'manifest.json');
  installedModules = {};
  remoteModuleVersions = {};
  newInstallInProgress = {};
  download = {
    // currently downloading
    active: false,
    // {name, version}
    queue: [],
    // current queue index being downloaded
    next: 0,
    // download failure count
    failures: 0
  };
  unzip = {
    // currently unzipping
    active: false,
    // {name, version, zipfile}
    queue: [],
    // current queue index being unzipped
    next: 0,
    // unzip failure count
    failures: 0
  };
  logger.log(`Modules initializing`);
  logger.log(`Distribution: ${locallyInstalledModules ? 'local' : 'remote'}`);
  logger.log(`Host updates: ${skipHostUpdate ? 'disabled' : 'enabled'}`);
  logger.log(`Module updates: ${skipModuleUpdate ? 'disabled' : 'enabled'}`);

  if (!locallyInstalledModules) {
    installedModulesFilePath = _path.default.join(moduleInstallPath, 'installed.json');
    moduleDownloadPath = _path.default.join(moduleInstallPath, 'pending');

    _mkdirp.default.sync(moduleDownloadPath);

    logger.log(`Module install path: ${moduleInstallPath}`);
    logger.log(`Module installed file path: ${installedModulesFilePath}`);
    logger.log(`Module download path: ${moduleDownloadPath}`);
    let failedLoadingInstalledModules = false;

    try {
      installedModules = JSON.parse(_fs.default.readFileSync(installedModulesFilePath));
    } catch (err) {
      failedLoadingInstalledModules = true;
    }

    cleanDownloadedModules(installedModules);
    bootstrapping = failedLoadingInstalledModules || settings.get(ALWAYS_BOOTSTRAP_MODULES);
  }

  hostUpdater = require('./hostUpdater'); // TODO: hostUpdater constants

  hostUpdater.on('checking-for-update', () => events.append({
    type: CHECKING_FOR_UPDATES
  }));
  hostUpdater.on('update-available', () => hostOnUpdateAvailable());
  hostUpdater.on('update-progress', progress => hostOnUpdateProgress(progress));
  hostUpdater.on('update-not-available', () => hostOnUpdateNotAvailable());
  hostUpdater.on('update-manually', newVersion => hostOnUpdateManually(newVersion));
  hostUpdater.on('update-downloaded', () => hostOnUpdateDownloaded());
  hostUpdater.on('error', err => hostOnError(err));
  const setFeedURL = hostUpdater.setFeedURL.bind(hostUpdater);
  remoteBaseURL = `${endpoint}/modules/${buildInfo.releaseChannel}`; // eslint-disable-next-line camelcase

  remoteQuery = {
    host_version: buildInfo.version
  };

  switch (process.platform) {
    case 'darwin':
      setFeedURL(`${endpoint}/updates/${buildInfo.releaseChannel}?platform=osx&version=${buildInfo.version}`);
      remoteQuery.platform = 'osx';
      break;

    case 'win32':
      // Squirrel for Windows can't handle query params
      // https://github.com/Squirrel/Squirrel.Windows/issues/132
      setFeedURL(`${endpoint}/updates/${buildInfo.releaseChannel}`);
      remoteQuery.platform = 'win';
      break;

    case 'linux':
      setFeedURL(`${endpoint}/updates/${buildInfo.releaseChannel}?platform=linux&version=${buildInfo.version}`);
      remoteQuery.platform = 'linux';
      break;
  }
}

function cleanDownloadedModules(installedModules) {
  try {
    const entries = _fs.default.readdirSync(moduleDownloadPath) || [];
    entries.forEach(entry => {
      const entryPath = _path.default.join(moduleDownloadPath, entry);

      let isStale = true;

      for (const moduleName of Object.keys(installedModules)) {
        if (entryPath === installedModules[moduleName].updateZipfile) {
          isStale = false;
          break;
        }
      }

      if (isStale) {
        _fs.default.unlinkSync(_path.default.join(moduleDownloadPath, entry));
      }
    });
  } catch (err) {
    logger.log('Could not clean downloaded modules');
    logger.log(err.stack);
  }
}

function hostOnUpdateAvailable() {
  logger.log(`Host update is available.`);
  hostUpdateAvailable = true;
  events.append({
    type: UPDATE_CHECK_FINISHED,
    succeeded: true,
    updateCount: 1,
    manualRequired: false
  });
  events.append({
    type: DOWNLOADING_MODULE,
    name: 'host',
    current: 1,
    total: 1,
    foreground: !runningInBackground
  });
}

function hostOnUpdateProgress(progress) {
  logger.log(`Host update progress: ${progress}%`);
  events.append({
    type: DOWNLOADING_MODULE_PROGRESS,
    name: 'host',
    progress: progress
  });
}

function hostOnUpdateNotAvailable() {
  logger.log(`Host is up to date.`);

  if (!skipModuleUpdate) {
    checkForModuleUpdates();
  } else {
    events.append({
      type: UPDATE_CHECK_FINISHED,
      succeeded: true,
      updateCount: 0,
      manualRequired: false
    });
  }
}

function hostOnUpdateManually(newVersion) {
  logger.log(`Host update is available. Manual update required!`);
  hostUpdateAvailable = true;
  checkingForUpdates = false;
  events.append({
    type: UPDATE_MANUALLY,
    newVersion: newVersion
  });
  events.append({
    type: UPDATE_CHECK_FINISHED,
    succeeded: true,
    updateCount: 1,
    manualRequired: true
  });
}

function hostOnUpdateDownloaded() {
  logger.log(`Host update downloaded.`);
  checkingForUpdates = false;
  events.append({
    type: DOWNLOADED_MODULE,
    name: 'host',
    current: 1,
    total: 1,
    succeeded: true
  });
  events.append({
    type: DOWNLOADING_MODULES_FINISHED,
    succeeded: 1,
    failed: 0
  });
}

function hostOnError(err) {
  logger.log(`Host update failed: ${err}`); // [adill] osx unsigned builds will fire this code signing error inside setFeedURL and
  // if we don't do anything about it hostUpdater.checkForUpdates() will never respond.

  if (err && String(err).indexOf('Could not get code signature for running application') !== -1) {
    console.warn('Skipping host updates due to code signing failure.');
    skipHostUpdate = true;
  }

  checkingForUpdates = false;

  if (!hostUpdateAvailable) {
    events.append({
      type: UPDATE_CHECK_FINISHED,
      succeeded: false,
      updateCount: 0,
      manualRequired: false
    });
  } else {
    events.append({
      type: DOWNLOADED_MODULE,
      name: 'host',
      current: 1,
      total: 1,
      succeeded: false
    });
    events.append({
      type: DOWNLOADING_MODULES_FINISHED,
      succeeded: 0,
      failed: 1
    });
  }
}

function checkForUpdates() {
  if (checkingForUpdates) return;
  checkingForUpdates = true;
  hostUpdateAvailable = false;

  if (skipHostUpdate) {
    events.append({
      type: CHECKING_FOR_UPDATES
    });
    hostOnUpdateNotAvailable();
  } else {
    logger.log('Checking for host updates.');
    hostUpdater.checkForUpdates();
  }
} // Indicates that the initial update process is complete and that future updates
// are background updates. This merely affects the content of the events sent to
// the app so that analytics can correctly attribute module download/installs
// depending on whether they were ui-blocking or not.


function setInBackground() {
  runningInBackground = true;
}

function getRemoteModuleName(name) {
  if (process.platform === 'win32' && process.arch === 'x64') {
    return `${name}.x64`;
  }

  return name;
}

async function checkForModuleUpdates() {
  const query = { ...remoteQuery,
    _: Math.floor(Date.now() / 1000 / 60 / 5)
  };
  const url = `${remoteBaseURL}/versions.json`;
  logger.log(`Checking for module updates at ${url}`);
  let response;

  try {
    response = await request.get({
      url,
      qs: query,
      timeout: REQUEST_TIMEOUT
    });
    checkingForUpdates = false;
  } catch (err) {
    checkingForUpdates = false;
    logger.log(`Failed fetching module versions: ${String(err)}`);
    events.append({
      type: UPDATE_CHECK_FINISHED,
      succeeded: false,
      updateCount: 0,
      manualRequired: false
    });
    return;
  }

  remoteModuleVersions = JSON.parse(response.body);

  if (settings.get(USE_LOCAL_MODULE_VERSIONS)) {
    try {
      remoteModuleVersions = JSON.parse(_fs.default.readFileSync(localModuleVersionsFilePath));
      console.log('Using local module versions: ', remoteModuleVersions);
    } catch (err) {
      console.warn('Failed to parse local module versions: ', err);
    }
  }

  const updatesToDownload = [];

  for (const moduleName of Object.keys(installedModules)) {
    const installedModule = installedModules[moduleName];
    const installed = installedModule.installedVersion;

    if (installed === null) {
      continue;
    }

    const update = installedModule.updateVersion || 0;
    const remote = remoteModuleVersions[getRemoteModuleName(moduleName)] || 0;

    if (installed !== remote && update !== remote) {
      logger.log(`Module update available: ${moduleName}@${remote} [installed: ${installed}]`);
      updatesToDownload.push({
        name: moduleName,
        version: remote
      });
    }
  }

  events.append({
    type: UPDATE_CHECK_FINISHED,
    succeeded: true,
    updateCount: updatesToDownload.length,
    manualRequired: false
  });

  if (updatesToDownload.length === 0) {
    logger.log(`No module updates available.`);
  } else {
    updatesToDownload.forEach(e => addModuleToDownloadQueue(e.name, e.version));
  }
}

function addModuleToDownloadQueue(name, version, authToken) {
  download.queue.push({
    name,
    version,
    authToken
  });
  process.nextTick(() => processDownloadQueue());
}

async function processDownloadQueue() {
  if (download.active) return;
  if (download.queue.length === 0) return;
  download.active = true;
  const queuedModule = download.queue[download.next];
  download.next += 1;
  events.append({
    type: DOWNLOADING_MODULE,
    name: queuedModule.name,
    current: download.next,
    total: download.queue.length,
    foreground: !runningInBackground
  });
  let progress = 0;
  let receivedBytes = 0;
  const url = `${remoteBaseURL}/${encodeURIComponent(getRemoteModuleName(queuedModule.name))}/${encodeURIComponent(queuedModule.version)}`;
  logger.log(`Fetching ${queuedModule.name}@${queuedModule.version} from ${url}`);
  const headers = {};

  if (queuedModule.authToken) {
    headers['Authorization'] = queuedModule.authToken;
  }

  const moduleZipPath = _path.default.join(moduleDownloadPath, `${queuedModule.name}-${queuedModule.version}.zip`);

  const stream = _fs.default.createWriteStream(moduleZipPath);

  stream.on('progress', ({
    receivedBytes: newReceivedBytes,
    totalBytes
  }) => {
    receivedBytes = newReceivedBytes;
    const newProgress = Math.min(Math.floor(100 * (receivedBytes / totalBytes)), 100);

    if (progress !== newProgress) {
      progress = newProgress;
      logger.log(`Streaming ${queuedModule.name}@${queuedModule.version} to ${moduleZipPath}: ${progress}%`);
      events.append({
        type: DOWNLOADING_MODULE_PROGRESS,
        name: queuedModule.name,
        progress: progress
      });
    }
  });
  logger.log(`Streaming ${queuedModule.name}@${queuedModule.version} to ${moduleZipPath}`);

  try {
    const response = await request.get({
      url,
      qs: remoteQuery,
      headers,
      timeout: REQUEST_TIMEOUT,
      stream
    });
    finishModuleDownload(queuedModule.name, queuedModule.version, moduleZipPath, receivedBytes, response.statusCode === 200);
  } catch (err) {
    logger.log(`Failed fetching module ${queuedModule.name}@${queuedModule.version}: ${String(err)}`);
    finishModuleDownload(queuedModule.name, queuedModule.version, null, receivedBytes, false);
  }
}

function commitInstalledModules() {
  const data = JSON.stringify(installedModules, null, 2);

  _fs.default.writeFileSync(installedModulesFilePath, data);
}

function finishModuleDownload(name, version, zipfile, receivedBytes, succeeded) {
  if (!installedModules[name]) {
    installedModules[name] = {};
  }

  if (succeeded) {
    installedModules[name].updateVersion = version;
    installedModules[name].updateZipfile = zipfile;
    commitInstalledModules();
  } else {
    download.failures += 1;
  }

  events.append({
    type: DOWNLOADED_MODULE,
    name: name,
    current: download.next,
    total: download.queue.length,
    succeeded: succeeded,
    receivedBytes: receivedBytes
  });

  if (download.next >= download.queue.length) {
    const successes = download.queue.length - download.failures;
    logger.log(`Finished module downloads. [success: ${successes}] [failure: ${download.failures}]`);
    events.append({
      type: DOWNLOADING_MODULES_FINISHED,
      succeeded: successes,
      failed: download.failures
    });
    download.queue = [];
    download.next = 0;
    download.failures = 0;
    download.active = false;
  } else {
    const continueDownloads = () => {
      download.active = false;
      processDownloadQueue();
    };

    if (succeeded) {
      backoff.succeed();
      process.nextTick(continueDownloads);
    } else {
      logger.log(`Waiting ${Math.floor(backoff.current)}ms before next download.`);
      backoff.fail(continueDownloads);
    }
  }

  if (newInstallInProgress[name]) {
    addModuleToUnzipQueue(name, version, zipfile);
  }
}

function addModuleToUnzipQueue(name, version, zipfile) {
  unzip.queue.push({
    name,
    version,
    zipfile
  });
  process.nextTick(() => processUnzipQueue());
}

function processUnzipQueue() {
  if (unzip.active) return;
  if (unzip.queue.length === 0) return;
  unzip.active = true;
  const queuedModule = unzip.queue[unzip.next];
  const installedModule = installedModules[queuedModule.name];
  const installedVersion = installedModule != null ? installedModule.installedVersion : null;
  unzip.next += 1;
  events.append({
    type: INSTALLING_MODULE,
    name: queuedModule.name,
    current: unzip.next,
    total: unzip.queue.length,
    foreground: !runningInBackground,
    oldVersion: installedVersion,
    newVersion: queuedModule.version
  });
  let hasErrored = false;

  const onError = (error, zipfile) => {
    if (hasErrored) return;
    hasErrored = true;
    logger.log(`Failed installing ${queuedModule.name}@${queuedModule.version}: ${String(error)}`);
    succeeded = false;

    if (zipfile) {
      zipfile.close();
    }

    finishModuleUnzip(queuedModule, succeeded);
  };

  let succeeded = true;

  const extractRoot = _path.default.join(moduleInstallPath, queuedModule.name);

  logger.log(`Installing ${queuedModule.name}@${queuedModule.version} from ${queuedModule.zipfile}`);

  const processZipfile = (err, zipfile) => {
    if (err) {
      onError(err, null);
      return;
    }

    const totalEntries = zipfile.entryCount;
    let processedEntries = 0;
    zipfile.on('entry', entry => {
      processedEntries += 1;
      const percent = Math.min(Math.floor(processedEntries / totalEntries * 100), 100);
      events.append({
        type: INSTALLING_MODULE_PROGRESS,
        name: queuedModule.name,
        progress: percent
      }); // skip directories

      if (/\/$/.test(entry.fileName)) {
        zipfile.readEntry();
        return;
      }

      zipfile.openReadStream(entry, (err, stream) => {
        if (err) {
          onError(err, zipfile);
          return;
        }

        stream.on('error', e => onError(e, zipfile));
        (0, _mkdirp.default)(_path.default.join(extractRoot, _path.default.dirname(entry.fileName)), err => {
          if (err) {
            onError(err, zipfile);
            return;
          } // [adill] createWriteStream via original-fs is broken in Electron 4.0.0-beta.6 with .asar files
          // so we unzip to a temporary filename and rename it afterwards


          const tempFileName = _path.default.join(extractRoot, entry.fileName + '.tmp');

          const finalFileName = _path.default.join(extractRoot, entry.fileName);

          const writeStream = originalFs.createWriteStream(tempFileName);
          writeStream.on('error', e => {
            stream.destroy();

            try {
              originalFs.unlinkSync(tempFileName);
            } catch (err) {}

            onError(e, zipfile);
          });
          writeStream.on('finish', () => {
            try {
              originalFs.unlinkSync(finalFileName);
            } catch (err) {}

            try {
              originalFs.renameSync(tempFileName, finalFileName);
            } catch (err) {
              onError(err, zipfile);
              return;
            }

            zipfile.readEntry();
          });
          stream.pipe(writeStream);
        });
      });
    });
    zipfile.on('error', err => {
      onError(err, zipfile);
    });
    zipfile.on('end', () => {
      if (!succeeded) return;
      installedModules[queuedModule.name].installedVersion = queuedModule.version;
      finishModuleUnzip(queuedModule, succeeded);
    });
    zipfile.readEntry();
  };

  try {
    _yauzl.default.open(queuedModule.zipfile, {
      lazyEntries: true,
      autoClose: true
    }, processZipfile);
  } catch (err) {
    onError(err, null);
  }
}

function finishModuleUnzip(unzippedModule, succeeded) {
  delete newInstallInProgress[unzippedModule.name];
  delete installedModules[unzippedModule.name].updateZipfile;
  delete installedModules[unzippedModule.name].updateVersion;
  commitInstalledModules();

  if (!succeeded) {
    unzip.failures += 1;
  }

  events.append({
    type: INSTALLED_MODULE,
    name: unzippedModule.name,
    current: unzip.next,
    total: unzip.queue.length,
    succeeded: succeeded
  });

  if (unzip.next >= unzip.queue.length) {
    const successes = unzip.queue.length - unzip.failures;
    bootstrapping = false;
    logger.log(`Finished module installations. [success: ${successes}] [failure: ${unzip.failures}]`);
    unzip.queue = [];
    unzip.next = 0;
    unzip.failures = 0;
    unzip.active = false;
    events.append({
      type: INSTALLING_MODULES_FINISHED,
      succeeded: successes,
      failed: unzip.failures
    });
    return;
  }

  process.nextTick(() => {
    unzip.active = false;
    processUnzipQueue();
  });
}

function quitAndInstallUpdates() {
  logger.log(`Relaunching to install ${hostUpdateAvailable ? 'host' : 'module'} updates...`);

  if (hostUpdateAvailable) {
    hostUpdater.quitAndInstall();
  } else {
    relaunch();
  }
}

function relaunch() {
  logger.end();

  const {
    app
  } = require('electron');

  app.relaunch();
  app.quit();
}

function isInstalled(name, version) {
  const metadata = installedModules[name];
  if (locallyInstalledModules) return true;

  if (metadata && metadata.installedVersion > 0) {
    if (!version) return true;
    if (metadata.installedVersion === version) return true;
  }

  return false;
}

function getInstalled() {
  return { ...installedModules
  };
}

function install(name, defer, options) {
  let {
    version,
    authToken
  } = options || {};

  if (isInstalled(name, version)) {
    if (!defer) {
      events.append({
        type: INSTALLED_MODULE,
        name: name,
        current: 1,
        total: 1,
        succeeded: true
      });
    }

    return;
  }

  if (newInstallInProgress[name]) return;

  if (!updatable) {
    logger.log(`Not updatable; ignoring request to install ${name}...`);
    return;
  }

  if (defer) {
    if (version) {
      throw new Error(`Cannot defer install for a specific version module (${name}, ${version})`);
    }

    logger.log(`Deferred install for ${name}...`);
    installedModules[name] = {
      installedVersion: 0
    };
    commitInstalledModules();
  } else {
    logger.log(`Starting to install ${name}...`);

    if (!version) {
      version = remoteModuleVersions[name] || 0;
    }

    newInstallInProgress[name] = version;
    addModuleToDownloadQueue(name, version, authToken);
  }
}

function installPendingUpdates() {
  const updatesToInstall = [];

  if (bootstrapping) {
    let modules = {};

    try {
      modules = JSON.parse(_fs.default.readFileSync(bootstrapManifestFilePath));
    } catch (err) {}

    for (const moduleName of Object.keys(modules)) {
      installedModules[moduleName] = {
        installedVersion: 0
      };

      const zipfile = _path.default.join(paths.getResources(), 'bootstrap', `${moduleName}.zip`);

      updatesToInstall.push({
        moduleName,
        update: modules[moduleName],
        zipfile
      });
    }
  }

  for (const moduleName of Object.keys(installedModules)) {
    const update = installedModules[moduleName].updateVersion || 0;
    const zipfile = installedModules[moduleName].updateZipfile;

    if (update > 0 && zipfile != null) {
      updatesToInstall.push({
        moduleName,
        update,
        zipfile
      });
    }
  }

  if (updatesToInstall.length > 0) {
    logger.log(`${bootstrapping ? 'Bootstrapping' : 'Installing updates'}...`);
    updatesToInstall.forEach(e => addModuleToUnzipQueue(e.moduleName, e.update, e.zipfile));
  } else {
    logger.log('No updates to install');
    events.append({
      type: NO_PENDING_UPDATES
    });
  }
}