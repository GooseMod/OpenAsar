const { join } = require('path');
const fs = require('fs');
const Module = require('module');
const { execFile } = require('child_process');
const { app, autoUpdater } = require('electron');
const request = require('request');
const https = require('https');

const paths = require('../paths');

const mkdir = (x) => fs.mkdirSync(x, { recursive: true });

const events = exports.events = new (require('events').EventEmitter)();
exports.INSTALLED_MODULE = 'installed-module'; // Fixes DiscordNative ensureModule as it uses export

const MU_ENDPOINT = 'https://mu.openasar.dev';

let skipHost, skipModule,
  remote = {},
  installed = {},
  downloading, installing,
  basePath, manifestPath, downloadPath,
  host,
  baseUrl,
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
  mkdir(downloadPath);

  try {
    installed = JSON.parse(fs.readFileSync(manifestPath));
  } catch {
    for (const m of [ 'desktop_core', 'utils' ]) { // Ignore actual bootstrap manifest and choose our own core 2, others are deferred
      installed['discord_' + m] = { installedVersion: 0 }; // Set initial version as 0
    }
  }


  host = process.platform === 'linux' ? new (class HostLinux extends require('events').EventEmitter {
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

  baseUrl = `${MU_ENDPOINT}/${platform}/${releaseChannel}`;
};

const checkModules = async () => {
  remote = await new Promise(res => request({
    url: baseUrl + '/modules.json'
  }, (e, r, b) => res(JSON.parse(b))));

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

  const path = join(downloadPath, name + '-' + ver + '.tar');

  // log('Modules', 'Downloading', `${name}@${ver}`);

  const stream = zlib.createBrotliDecompress();
  stream.pipe(fs.createWriteStream(path));
  // const path = join(downloadPath, name + '-' + ver + '.tar.br');
  // const stream = fs.createWriteStream(path);

  stream.on('progress', ([ cur, total ]) => events.emit('downloading-module', { name, cur, total }));

  https.get(baseUrl + '/' + name, res => {
    success = res.statusCode === 200;
    res.pipe(stream);
  });

  await new Promise(res => stream.on('close', res));


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
  execFile('tar', ['-tf', path], (e, o) => total = o.toString().split('\n').length); // Get total count and extract in parallel

  const ePath = join(basePath, name);
  mkdir(ePath);

  const proc = execFile('tar', ['-xvf', path, '-C', ePath]);

  proc.on('error', onErr);
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