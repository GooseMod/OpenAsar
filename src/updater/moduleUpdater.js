const { join } = require('path');
const fs = require('fs');
const mkdirp = require('mkdirp');
const yauzl = require('yauzl');
const Module = require('module');

const paths = require('../paths');
const request = require('./request');

const events = exports.events = new (require('events').EventEmitter)();

let settings,
  bootstrapping,
  skipHost, skipModule,
  remote = {},
  installed = {},
  downloading, installing,
  basePath, manifestPath, downloadPath, bootstrapPath,
  hostUpdater,
  baseUrl, baseQuery,
  inBackground,
  checking, hostAvail;

const resetTracking = () => {
  const base = {
    done: 0,
    total: 0,
    fail: 0
  };

  downloading = Object.assign({}, base);
  installing = Object.assign({}, base);
};

exports.init = (endpoint, _settings, buildInfo) => {
  log('Modules', 'Init');

  settings = _settings;

  skipHost = settings.get('SKIP_HOST_UPDATE');
  skipModule = settings.get('SKIP_MODULE_UPDATE');

  basePath = join(paths.getUserDataVersioned(), 'modules');
  manifestPath = join(basePath, 'installed.json');
  downloadPath = join(basePath, 'pending');
  bootstrapPath = join(paths.getResources(), 'bootstrap', 'manifest.json');

  resetTracking();

  Module.globalPaths.push(basePath);

  // Purge pending
  fs.rmSync(downloadPath, { recursive: true, force: true });
  mkdirp.sync(downloadPath);

  try {
    installed = JSON.parse(fs.readFileSync(manifestPath));
  } catch (e) {
    bootstrapping = true;
  }


  hostUpdater = require('./hostUpdater');

  hostUpdater.on('checking-for-update', () => events.emit('checking-for-updates'));

  hostUpdater.on('update-available', () => {
    log('Modules', 'Host available');
  
    hostAvail = true;
    events.emit('update-check-finished', {
      succeeded: true,
      updateCount: 1,
      manualRequired: false
    });
  
    events.emit('downloading-module', {
      name: 'host',
      current: 1,
      total: 1,
      foreground: !inBackground
    });
  });

  hostUpdater.on('update-progress', progress => events.emit('downloading-module-progress', { name: 'host', progress }));

  hostUpdater.on('update-not-available', hostPassed);

  hostUpdater.on('update-manually', (v) => {
    log('Modules', 'Host manual');
    checking = false;
  
    events.emit('update-manually', {
      newVersion: v
    });
  
    events.emit('update-check-finished', {
      succeeded: true,
      updateCount: 1,
      manualRequired: true
    });
  });

  hostUpdater.on('update-downloaded', () => {
    checking = false;

    events.emit('downloaded-module', {
      name: 'host',
      current: 1,
      total: 1,
      succeeded: true
    });

    events.emit('downloading-modules-finished', {
      succeeded: 1,
      failed: 0
    });
  });

  hostUpdater.on('error', () => {
    log('Modules', 'Host error');

    checking = false;
    // die
  });

  const platform = process.platform === 'darwin' ? 'osx' : 'linux';
  hostUpdater.setFeedURL.bind(hostUpdater)(`${endpoint}/updates/${buildInfo.releaseChannel}?platform=${platform}&version=${buildInfo.version}`);

  baseUrl = `${endpoint}/modules/${buildInfo.releaseChannel}`;
  baseQuery = {
    host_version: buildInfo.version,
    platform
  };
};

const hostPassed = () => {
  log('Modules', 'Host good');

  if (skipModule) return events.emit('update-check-finished', {
    succeeded: true,
    updateCount: 0,
    manualRequired: false
  });

  checkModules();
};

const checkModules = async () => {
  hostAvail = false;

  const qs = {
    ...baseQuery,
    _: Math.floor(Date.now() / 300000) // 5 min intervals
  };
  const url = baseUrl + '/versions.json';

  log('Modules', 'Checking @', url);

  let resp;

  try {
    resp = await request.get({ url, qs, timeout: 15000 });
    checking = false;
  } catch (e) {
    log('Modules', 'Check failed', e);

    return events.emit('update-check-finished', {
      succeeded: false,
      updateCount: 0,
      manualRequired: false
    });
  }

  remote = JSON.parse(resp.body);

  const todo = [];
  for (const name in installed) {
    const inst = installed[name].installedVersion;
    const rem = remote[name];

    if (inst !== rem) {
      log('Modules', 'Update:', name, '|', inst, '->', rem);
      todo.push({ name, version: rem });
    }
  }

  events.emit('update-check-finished', {
    succeeded: true,
    updateCount: todo.length,
    manualRequired: false
  });
  
  if (todo.length === 0) return log('Modules', 'Nothing todo');

  for (const mod of todo) downloadModule(mod.name, mod.version);
};

const downloadModule = async (name, ver) => {
  downloading.total++;
  events.emit('downloading-module', {
    name,
    current: downloading.total,
    total: downloading.total,
    foreground: !inBackground
  });

  const url = baseUrl + '/' + name + '/' + ver;

  const path = join(downloadPath, name + '-' + ver + '.zip');
  const stream = fs.createWriteStream(path);

  let received = 0, progress = 0;
  stream.on('progress', ([recv, total]) => {
    received = recv;
    const nProgress = Math.min(100, Math.floor(100 * (recv / total)));

    if (progress === nProgress) return;

    progress = nProgress;
    events.emit('downloading-module-progress', {
      name,
      progress,
      recv,
      total
    });
  });

  log('Modules', 'Downloading', `${name}@${ver}`, 'from', url, 'to', path);

  let success = false;
  try {
    const resp = await request.get({
      url,
      qs: baseQuery,
      timeout: 15000,
      stream
    });

    success = resp.statusCode === 200;
  } catch (e) {
    log('Modules', 'Fetch errored', e);
  }

  if (!installed[name]) installed[name] = {};

  if (success) commitManifest();
    else downloading.fail++;

  events.emit('downloaded-module', {
    name: name,
    current: downloading.total,
    total: downloading.total,
    succeeded: success,
    receivedBytes: received
  });


  downloading.done++;

  if (downloading.done === downloading.total) {
    const succeeded = downloading.total - downloading.fail;
    log('Modules', 'Done downloads', `| ${succeeded}/${downloading.total} success`);

    events.emit('downloading-modules-finished', {
      succeeded,
      failed: downloading.fail
    });
  }

  installModule(name, ver, path);
};

const installModule = (name, ver, path) => {
  const currentVer = installed[name]?.installedVersion;

  installing.total++;
  events.emit('installing-module', {
    name,
    current: installing.total,
    total: installing.total,
    foreground: !inBackground,
    oldVersion: currentVer,
    newVersion: ver
  });

  log('Modules', 'Installing', `${name}@${ver}`, 'from', path);

  let success = true, hasError = false;

  const handleErr = (e) => {
    if (hasError) return;
    hasError = true;

    log('Modules', 'Failed install', `${name}@${ver}`, e);

    success = false;
    finishInstall(name, ver, success);
  };

  const processZipfile = (e, zip) => {
    if (e) return handleErr(e);

    const total = zip.entryCount;
    let entries = 0;
    zip.on('entry', () => {
      entries++;
      const progress = Math.min(100, Math.floor(entries / total * 100));

      events.emit('installing-module-progress', {
        name,
        progress,
        entries,
        total
      });
    });

    zip.on('error', handleErr);

    zip.on('end', () => {
      if (!success) return;

      installed[name].installedVersion = ver;
      commitManifest();

      finishInstall(name, ver, success);
    });
  };

  try {
    yauzl.open(path, {}, processZipfile);
  } catch (e) {
    onError(e);
  }
};

const finishInstall = (name, ver, success) => {
  if (!success) installing.fail++;

  events.emit('installed-module', {
    name,
    current: installing.total,
    total: installing.total,
    succeeded: success
  });

  installing.done++;
  log('Modules', 'Finished', `${name}@${ver}`);

  if (installing.done === (downloading.total || installing.done)) {
    const succeeded = installing.total - installing.fail;
    log('Modules', 'Done installs', `| ${succeeded}/${installing.total} success`);

    events.emit('installing-modules-finished', {
      succeeded,
      failed: installing.fail
    });
  
    resetTracking();

    bootstrapping = false;
  }
};


exports.checkForUpdates = () => {
  log('Modules', 'Checking');

  if (checking) return;
  checking = true;

  if (skipHost) {
    events.emit('checking-for-updates');
    hostPassed();
  } else {
    hostUpdater.checkForUpdates();
  }
};

exports.setInBackground = () => inBackground = true;

exports.quitAndInstallUpdates = () => {
  log('Modules', 'Relaunching');

  if (hostAvail) hostUpdater.quitAndInstall();
  else {
    const { app } = require('electron');

    app.relaunch();
    app.quit();
  }
};

const isInstalled = exports.isInstalled = (n, v) => installed[n] && !(v && installed[n].installedVersion !== v);
exports.getInstalled = () => ({ ...installed });

const commitManifest = () => fs.writeFileSync(manifestPath, JSON.stringify(installed, null, 2));

exports.install = (name, def, { version } = {}) => {
  if (isInstalled(name, version)) {
    if (!def) events.emit('installed-module', {
      name,
      current: 1,
      total: 1,
      succeeded: true
    });

    return;
  }

  if (def) {
    installed[name] = { installedVersion: 0 };
    return commitManifest();
  }

  downloadModule(name, version ?? remote[name] ?? 0);
};

exports.installPendingUpdates = () => {
  if (bootstrapping) {
    log('Modules', 'Bootstrapping...');

    try {
      for (const m in JSON.parse(fs.readFileSync(bootstrapPath))) { // Read [resources]/bootstrap/manifest.json, with "moduleName": version (always 0)
        installed[m] = { installedVersion: 0 }; // Set initial
        installModule(m, 0, join(bootstrapPath, m)); // Intentional invalid path
      }
    } catch (e) {
      log('Modules', 'Bootstrap fail', e);
    }

    return;
  }

  events.emit('no-pending-updates');
};