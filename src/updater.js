const cp = require('child_process');
const { app } = require('electron');
const Module = require('module');
const { join, dirname, basename } = require('path');
const fs = require('fs');
const zlib = require('zlib');

const paths = require('./paths');

const { releaseChannel: channel, version: hostVersion } = require('./utils/buildInfo');
// const { NEW_UPDATE_ENDPOINT: endpoint } = require('./Constants');

const exeDir = paths.getExeDir();

const platform = process.platform === 'win32' ? 'win' : (process.platform === 'darwin' ? 'osx' : 'linux');
const modulesPath = platform === 'win' ? join(exeDir, 'modules') : join(paths.getUserData(), 'modules');
const pendingPath = join(modulesPath, '..', 'pending');

const handleInstalled = dir => {
  const inst = dir.sort((a, b) => parseInt(a.split('-')[1]) - parseInt(b.split('-')[1]))
    .concat('host-' + parseInt(hostVersion.split('.').pop()))
    .reduce((acc, x) => {
      const [ name, version ] = x.split('-');
      acc[name] = parseInt(version);
      return acc;
    }, {});

  Module.globalPaths = dir.map(x => join(modulesPath, x));

  return _installed = inst;
};

let _installed;
const getInstalled = async (useCache = true) => (useCache && _installed) || handleInstalled(await fs.promises.readdir(modulesPath).catch(_ => []));

const MU_ENDPOINT = oaConfig.muEndpoint ?? 'https://mu.openasar.dev';
const https = MU_ENDPOINT.startsWith('https') ? require('https') : require('http');

let _manifest;
let lastManifest;
const getManifest = async () => {
  const manifestTime = Math.floor(Date.now() / 1000 / 60 / 5); // cache for ~5m, client and server
  if (_manifest && lastManifest >= manifestTime) return _manifest;

  return await new Promise(fin => https.get(`${MU_ENDPOINT}/${platform}/${channel}/modules.json?_=${manifestTime}`, async res => {
    let data = '';

    res.on('data', d => data += d.toString());

    res.on('end', () => {
      const modules = JSON.parse(data);

      fin(_manifest = {
        modules,
        required_modules: [ 'discord_desktop_core', 'discord_erlpack', 'discord_spellcheck', 'discord_utils', 'discord_voice' ]
      });

      lastManifest = manifestTime;
    });
  }));
};

let progressCallback;

const installModule = async (name, force = false) => { // install module
  log('Updater', `Installing ${name}...`);
  const start = Date.now();

  const installed = await getInstalled();
  const manifest = await getManifest();

  const localVersion = installed[name];
  const version = manifest.modules[name];

  if (!force && localVersion === version) {
    log('Updater', 'Already installed', name);
    return;
  }

  log('Updater', `Downloading ${name}@${version}`);

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

      progressCb('Download', downloadCurrent, downloadTotal);
    });
  });

  await new Promise(res => stream.on('end', res));

  progressCb('Download', downloadTotal, downloadTotal);

  log('Updater', `Downloaded ${name}@${version}`);

  await fs.promises.mkdir(finalPath, { recursive: true }).catch(_ => {});

  const proc = cp.execFile('tar', [ '-xf', tarPath, '-C', finalPath]);

  await new Promise(res => proc.on('close', res));

  progressCb('Install', 1, 1);

  log('Updater', `Installed ${name}@${version} in ${(Date.now() - start).toFixed(2)}ms`);

  if (localVersion && name !== 'host') fs.promises.rm(join(modulesPath, name + '-' + localVersion), { recursive: true }); // delete old module (later)
  getInstalled(false); // update installed cache (later)

  return [ name, version, finalPath ];
};

const restartInto = x => {
  log('Updater', 'Restarting into', x);

  process.once('exit', () => cp.spawn(join(x, basename(process.execPath)), [], {
    detached: true,
    stdio: 'inherit'
  }));

  process.exit(); // immediately exit
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
    const otherApps = fs.readdirSync(installDir).filter(x => x.startsWith('app-') && x !== basename(dirname(process.execPath))).map(x => parseInt(x.split('.').pop())); // use process.execPath to handle possible buildInfo mismatch (should never normally)

    const wanted = manifest.modules.host;
    for (const x of otherApps.filter(x => x !== wanted)) { // delete older app dirs
      const p = join(installDir, 'app-1.0.' + x);

      log('Updater', 'Deleting old app dir', p);
      fs.promises.rm(p, { recursive: true });
    }

    if (otherApps.includes(wanted)) {
      const p = join(installDir, 'app-1.0.' + wanted);

      restartInto(p);
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

  const hostInstall = installs.find(x => x[0] === 'host');
  if (hostInstall && options.restart) {
    const [ ,, path ] = hostInstall;

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
    valid: true,
    installModule,
    updateToLatestWithOptions,
    commitModules: () => {},

    queryCurrentVersions: async () => ({
      current_modules: await getInstalled()
    }),

    queryAndTruncateHistory: () => []
  }),

  requireNative: (mod, path = '') => require(join(modulesPath, mod + '-' + (_installed ?? handleInstalled(fs.readdirSync(modulesPath)))[mod], mod, path))
};