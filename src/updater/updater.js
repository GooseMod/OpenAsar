const cp = require('child_process');
const { app } = require('electron');
const Module = require('module');
const { join, resolve, dirname, basename } = require('path');
// const https = require('http');
const https = require('https');
const fs = require('fs');
const zlib = require('zlib');

const paths = require('../paths');

const USE_MU = true;

const { releaseChannel, version: hostVersion } = require('../utils/buildInfo');
// const releaseChannel = 'canary';
const { NEW_UPDATE_ENDPOINT: endpoint } = require('../Constants');

const platform = process.platform === 'win32' ? 'win' : 'osx';
const modulesPath = platform === 'win' ? join(paths.getExeDir(), 'modules') : join(paths.getUserDataVersioned(), 'modules');
const pendingPath = join(modulesPath, '..', 'pending');

let _installed;
const getInstalled = async (useCache = true) => (useCache && _installed) || (_installed = (await fs.promises.readdir(modulesPath).catch(_ => [])).sort((a, b) => parseInt(a.split('-')[1]) - parseInt(b.split('-')[1])).reduce((acc, x) => {
  const [ name, version ] = x.split('-');
  acc[name] = parseInt(version);
  return acc;
}, {}));

const MU_ENDPOINT = 'https://mu.openasar.dev';

let _manifest;
let lastManifest;
const getManifest = async () => {
  const manifestTime = Math.floor(Date.now() / 1000 / 60 / 5); // cache for ~5m, client and server
  if (_manifest && lastManifest >= manifestTime) return _manifest;

  return await new Promise(fin => https.get(`${MU_ENDPOINT}/${platform}/${releaseChannel}/modules.json?_=${manifestTime}`, async res => {
    let data = '';

    res.on('data', d => data += d.toString());

    res.on('end', () => {
      const modules = JSON.parse(data);

      _manifest = {
        modules,
        required_modules: [ 'discord_desktop_core', 'discord_utils' ]
      };

      fin(_manifest);

      lastManifest = manifestTime;
    });
  }));
};

const installModule = async (name, _progressCallback = () => {}, force = false) => { // install module
  log('Updater', `Installing module ${name}...`);
  const start = Date.now();

  const installed = await getInstalled();
  const manifest = await getManifest();

  const version = manifest.modules[name];

  if (!force && installed[name] === version) {
    log('Updater', 'Aborting install of', name, '- already installed!');
    return;
  }

  log('Updater', `Downloading ${name}@${version}...`);

  const path = `${name}-${version}`;

  const tarPath = join(pendingPath, path + '.tar');
  const finalPath = join(modulesPath, path, name);

  // await fs.promises.mkdir(dirname(tarPath)).catch(_ => {});

  const stream = zlib.createBrotliDecompress();
  stream.pipe(fs.createWriteStream(tarPath));

  const progressCallback = (type, percent) => _progressCallback({
    state: percent === 100 ? 'Complete' : type,
    task: {
      ['Module' + type]: {
        package_sha256: name,
        version: { module: { name } }
      }
    },
    percent
  });

  let downloadTotal = 0, downloadCurrent = 0;
  https.get(`${MU_ENDPOINT}/${platform}/${releaseChannel}/${name}?v=${version}`, res => { // query for caching
    res.pipe(stream);

    downloadTotal = parseInt(res.headers['content-length'] ?? 1, 10);

    res.on('data', c => {
      downloadCurrent += c.length;
      console.log(name, (downloadCurrent / downloadTotal) * 100);

      progressCallback('Download', (downloadCurrent / downloadTotal) * 100);
    });
  });

  await new Promise(res => stream.on('end', res));

  progressCallback('Download', 100);

  log('Updater', `Downloaded ${name}@${version} (${(downloadTotal / 1024 / 1024).toFixed(2)} MB)`);

  let extractTotal = 0, extractCurrent = 0;

  // cp.execFile('tar', ['-tf', tarPath]).stdout.on('data', x => extractTotal += x.toString().split('\n').length - 1);

  await fs.promises.mkdir(finalPath, { recursive: true }).catch(_ => {});

  // const proc = cp.execFile('tar', ['--strip-components', '1', '-xvf', tarPath, '-C', finalPath]);
  const proc = cp.execFile('tar', [/*'--strip-components', '1', */ '-xf', tarPath, '-C', finalPath]);

  /* proc.stdout.on('data', x => {
    extractCurrent += x.toString().split('\n').length - 1;
    console.log('wow', extractCurrent, extractTotal);

    progressCallback('Install', (extractCurrent / extractTotal) * 100);
  }); */

  await new Promise(res => proc.on('close', res));

  progressCallback('Install', 100);

  log('Updater', `Installed ${name}@${version}`);
  log('Updater', `Took ${(Date.now() - start).toFixed(2)}ms`);

  // fs.rm(tarPath, () => {}); // clean up downloaded tar after
  // getInstalled(false); // update cached installed after
};

const commitModules = async () => {
  const installed = await getInstalled(false);
  for (const m in installed) {
    Module.globalPaths.push(join(modulesPath, m + '-' + installed[m]));
  }
};

const queryCurrentVersions = async () => ({
  current_modules: await getInstalled()
});

const queryAndTruncateHistory = () => [];

let lastCheck;
const updateToLatestWithOptions = async (options, callback) => {
  if (lastCheck > Date.now() - 5000) return; // don't check again if already checked in the last 5s

  let installed = await getInstalled();
  const manifest = await getManifest();

  const wanted = Object.keys(installed).concat(manifest.required_modules).filter((x, i, arr) => i === arr.indexOf(x)); // installed + required

  console.log('installed', installed);
  console.log('wanted', wanted);

  const installs = [];
  for (const m of wanted) {
    const local = installed[m] ?? -1;
    const remote = manifest.modules[m];

    if (remote > local) {
      log('Updater', 'Module update:', m, local, '->', remote);
      installs.push(installModule(m, callback));
    }
  }

  const start = Date.now();
  await Promise.all(installs);
  if (installs.length > 0) log('Updater', `Updated ${installs.length} modules in ${(Date.now() - start).toFixed(2)}ms`);

  await commitModules();

  lastCheck = Date.now();
  // await new Promise(res => setTimeout(res, 100000));
};

const startCurrentVersion = async () => {

};

log('Updater', 'Modules path:', modulesPath);
log('Updater', 'Pending path:', pendingPath);

fs.rmSync(pendingPath, { recursive: true, force: true });
fs.mkdirSync(pendingPath, { recursive: true });

// prefetch manifest and preget installed in background on require to get ready as it'll be used very soon
getInstalled();
getManifest();

const events = new (require('events').EventEmitter)();
module.exports = {
  getUpdater: () => ({
    installModule,
    commitModules,
    queryCurrentVersions,
    queryAndTruncateHistory,
    updateToLatestWithOptions,

    startCurrentVersion,
    collectGarbage: () => {},

    getKnownFolder: _ => '',
    createShortcut: _ => {},

    valid: true,
    on: events.on
  }),

  tryInitUpdater: () => true
};