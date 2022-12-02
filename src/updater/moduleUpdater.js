const { join } = require('path');
const fs = require('fs');
const Module = require('module');
const { execFile } = require('child_process');
const { app, autoUpdater } = require('electron');
const { get } = require('https');

const paths = require('../paths');

const mkdir = (x) => fs.mkdirSync(x, { recursive: true });

const events = exports.events = new (require('events').EventEmitter)();
exports.INSTALLED_MODULE = 'installed-module'; // Fixes DiscordNative ensureModule as it uses export

let skipHost, skipModule,
  remote = {},
  installed = {},
  downloading, installing,
  basePath, manifestPath, downloadPath,
  host,
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

const req = url => new Promise(res => get(url, r => { // Minimal wrapper around https.get to include body
  let dat = '';
  r.on('data', b => dat += b.toString());

  r.on('end', () => res([ r, dat ]));
}));

const redirs = url => new Promise(res => get(url, r => { // Minimal wrapper around https.get to follow redirects
  const loc = r.headers.location;
  if (loc) return redirs(loc).then(res);

  res(r);
}));

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
  mkdir(downloadPath);

  try {
    installed = JSON.parse(fs.readFileSync(manifestPath));
  } catch {
    for (const m of [ 'desktop_core', 'utils', 'voice' ]) { // Ignore actual bootstrap manifest and choose our own core set, others are deferred
      installed['discord_' + m] = { installedVersion: 0 }; // Set initial version as 0
    }
  }


  host = process.platform === 'linux' ? new (class HostLinux extends require('events').EventEmitter {
    setFeedURL(url) {
      this.url = url;
    }

    checkForUpdates() {
      req(this.url).then(([ r, b ]) => {
        if (r.statusCode === 204) return this.emit('update-not-available');

        this.emit('update-manually', b);
      });
    }

    quitAndInstall() {
      app.relaunch();
      app.quit();
    }
  })() : autoUpdater;


  host.on('update-progress', progress => events.emit('downloading-module', { name: 'host', progress }));

  host.on('update-manually', e => events.emit('manual', e));

  host.on('update-downloaded', host.quitAndInstall);

  host.on('error', () => {
    log('Modules', 'Host error');

    events.emit('checked', { failed: true });
  });

  const platform = process.platform === 'darwin' ? 'osx' : 'linux';
  host.setFeedURL(`${endpoint}/updates/${releaseChannel}?platform=${platform}&version=${version}`);

  baseUrl = `${endpoint}/modules/${releaseChannel}`;
  qs = `?host_version=${version}&platform=${platform}`;
};

const checkModules = async () => {
  remote = JSON.parse((await req(baseUrl + '/versions.json' + qs))[1]);

  for (const name in installed) {
    const inst = installed[name].installedVersion;
    const rem = remote[name];

    if (inst !== rem) {
      log('Modules', 'Update:', name, inst, '->', rem);

      downloadModule(name, rem);
    }
  }

  return downloading.total;
};

const downloadModule = async (name, ver) => {
  downloading.total++;

  const path = join(downloadPath, name + '-' + ver + '.zip');
  const file = fs.createWriteStream(path);

  // log('Modules', 'Downloading', `${name}@${ver}`);

  let success, total, cur =  0;
  const res = await redirs(baseUrl + '/' + name + '/' + ver + qs);
  success = res.statusCode === 200;
  total = parseInt(res.headers['content-length'] ?? 1, 10);

  res.pipe(file);

  res.on('data', c => {
    cur += c.length;

    events.emit('downloading-module', { name, cur, total });
  });

  await new Promise((res) => file.on('close', res));

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

  let err;
  const onErr = e => {
    if (err) return;
    err = true;

    log('Modules', 'Failed install', name, e);

    finishInstall(name, ver, false);
  };


  // Extract zip via unzip cmd line - replaces yauzl dep (speed++, size--, jank++)
  let total = 0, cur = 0;
  execFile('unzip', ['-l', path], (e, o) => total = parseInt(o.toString().match(/([0-9]+) files/)?.[1] ?? 0)); // Get total count and extract in parallel

  const ePath = join(basePath, name);
  mkdir(ePath);

  const proc = execFile('unzip', ['-o', path, '-d', ePath]);

  proc.on('error', (e) => {
    if (e.code === 'ENOENT') {
      require('electron').dialog.showErrorBox('Failed Dependency', 'Please install "unzip"');
      process.exit(1); // Close now
    }

    onErr(e);
  });
  proc.stderr.on('data', onErr);

  proc.stdout.on('data', x => {
    cur += x.toString().split('\n').length;

    events.emit('installing-module', { name, cur, total });
  });

  proc.on('close', () => {
    if (err) return;

    installed[name] = { installedVersion: ver };
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


exports.checkForUpdates = async () => {
  log('Modules', 'Checking');

  const done = (e = {}) => events.emit('checked', e);

  if (last > Date.now() - 10000) return done();

  let p = [];
  if (!skipHost) {
    p.push(new Promise((res) => host.once('update-not-available', res)));
    host.checkForUpdates();
  }

  if (!skipModule) p.push(checkModules());

  done({
    count: (await Promise.all(p)).pop()
  });
};

exports.quitAndInstallUpdates = () => host.quitAndInstall();

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