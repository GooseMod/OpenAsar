const cp = require('child_process');
const { app } = require('electron');
const Module = require('module');
const { join, resolve, dirname, basename } = require('path');
const fs = require('fs');
const zlib = require('zlib');

const paths = require('./paths');

const { releaseChannel: channel, version: hostVersion } = require('./utils/buildInfo');
// const { NEW_UPDATE_ENDPOINT: endpoint } = require('./Constants');

const exeDir = paths.getExeDir();

const platform = process.platform === 'win32' ? 'win' : (process.platform === 'darwin' ? 'osx' : 'linux');
const modulesPath = platform === 'win' ? join(exeDir, 'modules') : join(paths.getUserData(), 'modules');
const pendingPath = join(modulesPath, '..', 'pending');

let _installed;
const getInstalled = async (useCache = true) => (useCache && _installed) ||
  (_installed = (await fs.promises.readdir(modulesPath).catch(_ => []))
  .sort((a, b) => parseInt(a.split('-')[1]) - parseInt(b.split('-')[1]))
  .concat('host-' + parseInt(hostVersion.split('.').pop()))
  .reduce((acc, x) => {
    const [ name, version ] = x.split('-');
    acc[name] = parseInt(version);
    return acc;
  }, {}));

const MU_ENDPOINT = oaConfig.muEndpoint ?? 'https://mu.openasar.dev';
// const MU_ENDPOINT = 'http://localhost:9999';
const https = MU_ENDPOINT.startsWith('https') ? require('https') : require('http');

let _manifest;
let lastManifest;
const getManifest = async () => {
  const manifestTime = Math.floor(Date.now() / 1000 / 60 / 5); // cache for ~5m, client and server
  if (_manifest && lastManifest >= manifestTime) return _manifest;

  // console.log(`${MU_ENDPOINT}/${platform}/${channel}/modules.json?_=${manifestTime}`);

  return await new Promise(fin => https.get(`${MU_ENDPOINT}/${platform}/${channel}/modules.json?_=${manifestTime}`, async res => {
    let data = '';

    res.on('data', d => data += d.toString());

    res.on('end', () => {
      const modules = JSON.parse(data);

      fin(_manifest = {
        modules,
        // required_modules: [ 'discord_desktop_core', 'discord_utils' ]
        required_modules: [ 'discord_desktop_core', 'discord_erlpack', 'discord_spellcheck', 'discord_utils', 'discord_voice' ]
        // required_modules: [ 'discord_desktop_core', 'discord_erlpack', 'discord_spellcheck', 'discord_utils', 'discord_voice', 'discord_krisp', 'discord_game_utils', 'discord_rpc', 'discord_overlay2', 'discord_cloudsync' ]
      });

      lastManifest = manifestTime;
    });
  }));
};

let progressCallback;

const installModule = async (name, force = false) => { // install module
  log('Updater', `Installing module ${name}...`);
  const start = Date.now();

  const installed = await getInstalled();
  const manifest = await getManifest();

  const localVersion = installed[name];
  const version = manifest.modules[name];

  if (!force && localVersion === version) {
    log('Updater', 'Aborting install of', name, '- already installed!');
    return;
  }

  log('Updater', `Downloading ${name}@${version}...`);

  const path = `${name}-${version}`;

  const tarPath = join(pendingPath, path + '.tar');
  const finalPath = name === 'host' ? join(exeDir, '..', 'app-1.0.' + version) : join(modulesPath, path, name);

  // await fs.promises.mkdir(dirname(tarPath)).catch(_ => {});

  const stream = zlib.createBrotliDecompress();
  stream.pipe(fs.createWriteStream(tarPath));

  const progressCb = (type, current, total) => progressCallback({
    state: current === total ? 'Complete' : type,
    task: {
      ['Module' + type]: {
        name,
        version: { module: { name } }
      }
    },
    current, total,
    percent: (current / total) * 100
  });

  let downloadTotal = 0, downloadCurrent = 0;
  https.get(`${MU_ENDPOINT}/${platform}/${channel}/${name}?v=${version}`, res => { // query for caching
    res.pipe(stream);

    downloadTotal = parseInt(res.headers['content-length'] ?? 1, 10);

    res.on('data', c => {
      downloadCurrent += c.length;

      // await new Promise(res => setTimeout(res, 5000));
      progressCb('Download', downloadCurrent, downloadTotal);
    });
  });

  await new Promise(res => stream.on('end', res));

  progressCb('Download', downloadTotal, downloadTotal);

  log('Updater', `Downloaded ${name}@${version} (${(downloadTotal / 1024 / 1024).toFixed(2)} MB)`);

  // let extractTotal = 0, extractCurrent = 0;

  // cp.execFile('tar', ['-tf', tarPath]).stdout.on('data', x => extractTotal += x.toString().split('\n').length - 1);

  await fs.promises.mkdir(finalPath, { recursive: true }).catch(_ => {});

  const proc = cp.execFile('tar', [ '-xf', tarPath, '-C', finalPath]);

  /* proc.stdout.on('data', x => {
    extractCurrent += x.toString().split('\n').length - 1;
    console.log('wow', extractCurrent, extractTotal);

    progressCb('Install', (extractCurrent / extractTotal) * 100);
  }); */

  await new Promise(res => proc.on('close', res));

  progressCb('Install', 1, 1);

  log('Updater', `Installed ${name}@${version} in ${(Date.now() - start).toFixed(2)}ms`);

  if (localVersion && name !== 'host') fs.promises.rm(join(modulesPath, name + '-' + localVersion), { recursive: true }); // delete old module

  return [ name, version, finalPath ];
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

const queryAndTruncateHistory = () => []; // todo: log events for history

const restartInto = x => {
  process.once('exit', () => cp.spawn(join(x, basename(process.execPath)), [], {
    detached: true,
    stdio: 'inherit'
  }));

  app.exit();
};

let lastCheck, checking;
const updateToLatestWithOptions = async (options, callback) => {
  progressCallback = callback;
  if (checking || lastCheck > Date.now() - 5000) return; // don't check again if already checked in the last 5s

  checking = true;

  let installed = await getInstalled();
  const manifest = await getManifest();

  if (platform === 'win' && options.restart) { // manage app dirs on startup
    const installDir = join(exeDir, '..');
    const otherApps = fs.readdirSync(installDir).filter(x => x.startsWith('app-') && x !== basename(dirname(process.execPath))).map(x => parseInt(x.split('.').pop()));
    // use process.execPath to handle possible buildInfo mismatch (should never normally)

    for (const x of otherApps.filter(x => x < installed.host)) { // delete older app dirs
      const p = join(installDir, 'app-1.0.' + x);

      log('Updater', 'Deleting old app dir', p);
      fs.promises.rm(p, { recursive: true });
    }

    const latest = Math.max(...otherApps);
    if (latest > installed.host) {
      const p = join(installDir, 'app-1.0.' + manifest.modules.host);

      log('Updater', 'Detected new app dir, restarting into', p);
      return restartInto(p);
    }
  }

  const wanted = Object.keys(installed).concat(manifest.required_modules).filter((x, i, arr) => i === arr.indexOf(x)); // installed + required

  log('Updater', 'Modules installed:', Object.keys(installed).map(x => `${x}@${installed[x]}`).join(', '));
  log('Updater', 'Modules wanted:', wanted.join(', '));

  let installs = [];
  for (const m of wanted) {
    const local = installed[m] ?? -1;
    const remote = manifest.modules[m];

    if (remote && remote !== local) { // allow downgrading (!= not >)
      log('Updater', 'Module update:', m, local, '->', remote);
      installs.push(installModule(m));
    }
  }

  const start = Date.now();
  installs = await Promise.all(installs);
  if (installs.length > 0) log('Updater', `Updated ${installs.length} modules in ${(Date.now() - start).toFixed(2)}ms`);

  await commitModules();

  const hostInstall = installs.find(x => x[0] === 'host');
  if (hostInstall && options.restart) {
    const [ ,, path ] = hostInstall;

    log('Updater', 'Updated host, restarting into', path);
    restartInto(path);
  }

  lastCheck = Date.now();
  checking = false;
};

log('Updater', 'Modules path:', modulesPath);

fs.rmSync(pendingPath, { recursive: true, force: true });
fs.mkdirSync(pendingPath, { recursive: true });

const events = new (require('events').EventEmitter)();
module.exports = {
  events,
  getUpdater: () => ({
    installModule,
    commitModules,
    queryCurrentVersions,
    queryAndTruncateHistory,
    updateToLatestWithOptions,

    getKnownFolder: _ => '',
    createShortcut: _ => {},

    valid: true,
    on: events.on // much extends such wow
  }),

  createShortcut: _ => {}, // shortcut deez nuts

  tryInitUpdater: _ => true
};