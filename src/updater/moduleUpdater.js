const { join } = require('path');
const fs = require('fs');
const mkdirp = require('mkdirp');
const Module = require('module');
const { execFile } = require('child_process');
const { Readable, Writable } = require('stream');
const zlib = require('zlib');

const paths = require('../paths');
const request = require('./request');

const events = exports.events = new (require('events').EventEmitter)();
exports.INSTALLED_MODULE = 'installed-module'; // Fixes DiscordNative ensureModule as it uses export

let skipHost, skipModule,
  remote = {},
  installed = {},
  downloading, installing,
  basePath, manifestPath, downloadPath,
  hostUpdater,
  baseUrl,
  checking, hostAvail, last;

const resetTracking = () => {
  const base = {
    done: 0,
    total: 0,
    fail: 0
  };

  downloading = Object.assign({}, base);
  installing = Object.assign({}, base);
};

exports.init = (endpoint, { releaseChannel, version }) => {
  skipHost = settings.get('SKIP_HOST_UPDATE');
  skipModule = settings.get('SKIP_MODULE_UPDATE');

  basePath = join(paths.getUserDataVersioned(), 'modules');
  manifestPath = join(basePath, 'installed.json');
  downloadPath = join(basePath, 'pending');

  resetTracking();

  Module.globalPaths.push(basePath);

  // Purge pending
  fs.rmSync(downloadPath, { recursive: true, force: true });
  mkdirp.sync(downloadPath);

  try {
    installed = JSON.parse(fs.readFileSync(manifestPath));
  } catch {
    for (const m of [ 'desktop_core', 'utils', 'voice' ]) { // Ignore actual bootstrap manifest and choose our own core 3, others are installed as/when needed
      installed['discord_' + m] = { installedVersion: 0 }; // Set initial version as 0
    }
  }


  hostUpdater = require('./hostUpdater');

  hostUpdater.on('update-available', () => {
    log('Modules', 'Host available');
  
    hostAvail = true;
    events.emit('update-check-finished', {
      succeeded: true,
      updateCount: 1
    });
  
    events.emit('downloading-module', {
      name: 'host'
    });
  });

  hostUpdater.on('update-progress', progress => events.emit('downloading-module-progress', { name: 'host', progress }));

  hostUpdater.on('update-not-available', hostPassed);

  hostUpdater.on('update-manually', v => {
    log('Modules', 'Host manual');
    checking = false;
  
    events.emit('update-manually', {
      newVersion: v
    });
  
    events.emit('update-check-finished', {
      succeeded: true,
      updateCount: 1
    });
  });

  hostUpdater.on('update-downloaded', () => {
    checking = false;

    events.emit('downloaded-module', {
      name: 'host'
    });

    events.emit('downloading-modules-finished', {
      succeeded: 1
    });
  });

  hostUpdater.on('error', () => {
    log('Modules', 'Host error');

    checking = false;

    events.emit('update-check-finished', { succeeded: false });
  });

  const platform = process.platform === 'darwin' ? 'osx' : 'linux';
  hostUpdater.setFeedURL(`${endpoint}/updates/${releaseChannel}?platform=${platform}&version=${version}`);

  // endpoint = 'https://cdn.jsdelivr.net/gh/openasar/mu@gh-pages';
  // endpoint = 'https://openasar.dev/Mu';
  endpoint = 'https://mu.openasar.dev'
  baseUrl = `${endpoint}/${platform}/${releaseChannel}`;
};

const hostPassed = (skip = skipModule) => {
  if (skip) return events.emit('update-check-finished', {
    succeeded: true,
    updateCount: 0
  });

  log('Modules', 'Host good');

  checkModules();
};

const checkModules = async () => {
  hostAvail = false;

  try {
    const { body } = await request.get(baseUrl + '/modules.json');

    checking = false;

    remote = JSON.parse(body);
  } catch (e) {
    log('Modules', 'Check failed', e);

    return events.emit('update-check-finished', {
      succeeded: false,
      updateCount: 0
    });
  }

  let doing = 0;
  for (const name in installed) {
    const inst = installed[name].installedVersion;
    const rem = remote[name];

    if (inst !== rem) {
      log('Modules', 'Update:', name, inst, '->', rem);
      doing++;
  
      downloadModule(name, rem);
    }
  }

  events.emit('update-check-finished', {
    succeeded: true,
    updateCount: doing
  });
};

const downloadModule = async (name, ver) => {
  downloading.total++;
  events.emit('downloading-module', {
    name
  });

  const url = baseUrl + '/' + name;
  const path = join(downloadPath, name + '-' + ver + '.tar');

  const stream = zlib.createBrotliDecompress();
  stream.pipe(fs.createWriteStream(path));
  // const path = join(downloadPath, name + '-' + ver + '.tar.br');
  // const stream = fs.createWriteStream(path);

  stream.on('progress', ([ cur, total ]) => events.emit('downloading-module-progress', {
    name,
    cur,
    total
  }));

  log('Modules', 'Downloading', `${name}@${ver}`);

  let success = false;
  try {
    const resp = await request.get({
      url,
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
    name
  });


  downloading.done++;

  if (downloading.done === downloading.total) {
    events.emit('downloading-modules-finished', {
      succeeded: downloading.total - downloading.fail,
      failed: downloading.fail
    });
  }

  installModule(name, ver, path);
};

const installModule = async (name, ver, path) => {
  installing.total++;
  events.emit('installing-module', {
    name
  });

  // log('Modules', 'Installing', `${name}@${ver}`);

  let hasError;

  const handleErr = e => {
    if (hasError) return;
    hasError = true;

    log('Modules', 'Failed install', `${name}@${ver}`, e);

    finishInstall(name, ver, false);
  };


  // Extract zip via unzip cmd line - replaces yauzl dep (speed++, size--, jank++)
  const ePath = join(basePath, name);

  let total = 0;
  await new Promise((res) => {
    const p = execFile('tar', ['-tf', path]);

    p.stdout.on('data', x => total += x.toString().split('\n').length);
    p.on('close', res);
  });

  mkdirp.sync(ePath);

  const proc = execFile('tar', ['-xvf', path, '-C', ePath]);

  proc.on('error', handleErr);
  proc.stderr.on('data', handleErr);

  let cur = 0;
  proc.stdout.on('data', x => {
    cur += x.toString().split('\n').length;
  
    events.emit('installing-module-progress', {
      name,
      cur,
      total
    });
  });

  proc.on('close', () => {
    if (hasError) return;
  
    installed[name].installedVersion = ver;
    commitManifest();
  
    finishInstall(name, ver, true);
  });
};

const finishInstall = (name, ver, success) => {
  if (!success) installing.fail++;

  events.emit('installed-module', {
    name,
    succeeded: true
  });

  installing.done++;
  log('Modules', 'Finished', `${name}@${ver}`);

  if (installing.done === downloading.total) {
    if (!installing.fail) last = Date.now();

    events.emit('installing-modules-finished', {
      succeeded: installing.total - installing.fail,
      failed: installing.fail
    });
  
    resetTracking();
  }
};


exports.checkForUpdates = () => {
  log('Modules', 'Checking');

  if (checking) return;
  checking = true;

  events.emit('checking-for-updates');

  if (skipHost) hostPassed();
    else if (last > Date.now() - 10000) hostPassed(true);
    else hostUpdater.checkForUpdates();
};

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