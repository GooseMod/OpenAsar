const { join } = require('path');
const fs = require('fs');
const mkdirp = require('mkdirp');
const Module = require('module');
const { execFile } = require('child_process');
const { autoUpdater } = require('electron');
const request = require('request');

const paths = require('../paths');

const events = exports.events = new (require('events').EventEmitter)();
exports.INSTALLED_MODULE = 'installed-module'; // Fixes DiscordNative ensureModule as it uses export

let skipHost, skipModule,
  remote = {},
  installed = {},
  downloading, installing,
  basePath, manifestPath, downloadPath,
  hostUpdater,
  baseUrl, qs,
  last;

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
    for (const m of [ 'desktop_core', 'utils' ]) { // Ignore actual bootstrap manifest and choose our own core 2, others are deferred
      installed['discord_' + m] = { installedVersion: 0 }; // Set initial version as 0
    }
  }


  hostUpdater = process.platform === 'linux' ? new (class HostLinux extends require('events').EventEmitter {
    setFeedURL(url) {
      this.url = url;
    }
  
    checkForUpdates() {
      request(this.url, (e, r, b) => {
        if (e) return this.emit('error');
  
        if (r.statusCode === 204) return this.emit('update-not-available');
  
        this.emit('update-manually', b);
      });
    }
  })() : autoUpdater;


  hostUpdater.on('update-progress', progress => events.emit('downloading-module', { name: 'host', progress }));

  hostUpdater.on('update-not-available', hostPassed);

  hostUpdater.on('update-manually', d => {
    log('Modules', 'Host manual');
  
    events.emit('manual', {
      details: d
    });
  });

  hostUpdater.on('update-downloaded', () => events.emit('downloaded-module', { name: 'host' }));

  hostUpdater.on('error', () => {
    log('Modules', 'Host error');

    events.emit('checked', { failed: true });
  });

  const platform = process.platform === 'darwin' ? 'osx' : 'linux';
  hostUpdater.setFeedURL(`${endpoint}/updates/${releaseChannel}?platform=${platform}&version=${version}`);

  baseUrl = `${endpoint}/modules/${releaseChannel}`;
  qs = {
    host_version: version,
    platform
  };
};

const hostPassed = (skip = skipModule) => {
  if (skip) return events.emit('checked', {
    count: 0
  });

  log('Modules', 'Host good');

  checkModules();
};

const checkModules = async () => {
  try {
    remote = await new Promise((res) => request({
      url: baseUrl + '/versions.json',
      qs
    }, (e, r, b) => res(JSON.parse(b))));
  } catch (e) {
    log('Modules', 'Check failed', e);

    return events.emit('checked', {
      failed: true
    });
  }

  for (const name in installed) {
    const inst = installed[name].installedVersion;
    const rem = remote[name];

    if (inst !== rem) {
      log('Modules', 'Update:', name, inst, '->', rem);
  
      downloadModule(name, rem);
    }
  }

  events.emit('checked', {
    count: downloading.total
  });
};

const downloadModule = async (name, ver) => {
  downloading.total++;

  const path = join(downloadPath, name + '-' + ver + '.zip');
  const file = fs.createWriteStream(path);

  // log('Modules', 'Downloading', `${name}@${ver}`);

  let success, total, cur = 0;
  request({
    url: baseUrl + '/' + name + '/' + ver,
    qs
  }).on('response', (res) => {
    success = res.statusCode === 200;
    total = parseInt(res.headers['content-length'] ?? 1, 10);

    res.pipe(file);

    res.on('data', c => {
      cur += c.length;

      events.emit('downloading-module', { name, cur, total });
    });
  });

  await new Promise((res) => file.on('close', res));


  if (!installed[name]) installed[name] = {};

  if (success) commitManifest();
    else downloading.fail++;

  events.emit('downloaded-module', {
    name
  });


  downloading.done++;

  if (downloading.done === downloading.total) {
    events.emit('downloaded', {
      failed: downloading.fail
    });
  }

  installModule(name, ver, path);
};

const installModule = async (name, ver, path) => {
  installing.total++;

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

  const total = await new Promise((res) => {
    const p = execFile('unzip', ['-l', path]);

    p.stdout.on('data', x => {
      const m = x.toString().match(/([0-9]+) files/);
      if (m) res(parseInt(m[1]));
    });

    p.stderr.on('data', res); // On error resolve undefined (??'d to 0)
  }) ?? 0;

  mkdirp.sync(ePath);

  const proc = execFile('unzip', ['-o', path, '-d', ePath]);

  proc.on('error', (err) => {
    if (err.code === 'ENOENT') {
      require('electron').dialog.showErrorBox('Failed Dependency', 'Please install "unzip"');
      process.exit(1); // Close now
    }

    handleErr(err);
  });

  proc.stderr.on('data', handleErr);

  let cur = 0;
  proc.stdout.on('data', x => x.toString().split('\n').forEach(y => {
    if (!y.includes('inflating')) return;

    cur++;
    events.emit('installing-module', { name, cur, total });
  }));

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

    events.emit('installed', {
      failed: installing.fail
    });
  
    resetTracking();
  }
};


exports.checkForUpdates = () => {
  log('Modules', 'Checking');

  events.emit('checking-for-updates');

  if (skipHost) hostPassed();
    else if (last > Date.now() - 10000) hostPassed(true);
    else hostUpdater.checkForUpdates();
};

exports.quitAndInstallUpdates = () => hostUpdater.quitAndInstall();

exports.isInstalled = (n, v) => installed[n] && !(v && installed[n].installedVersion !== v);
exports.getInstalled = () => ({ ...installed });

const commitManifest = () => fs.writeFileSync(manifestPath, JSON.stringify(installed, null, 2));

exports.install = (name, def, { version } = {}) => {
  if (exports.isInstalled(name, version)) {
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