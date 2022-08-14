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
const getInstalled = async (useCache = true) => (useCache && _installed) || (_installed = (await fs.promises.readdir(modulesPath)).sort((a, b) => parseInt(a.split('-')[1]) - parseInt(b.split('-')[1])).reduce((acc, x) => {
  const [ name, version ] = x.split('-');
  acc[name] = parseInt(version);
  return acc;
}, {}));

let _manifest;
/* const getManifest = async (useCache = true) => (useCache && _manifest) || (_manifest = await new Promise(fin => https.get(`${endpoint}distributions/app/manifests/latest?platform=${platform}&channel=${releaseChannel}&arch=x86`, async res => {
  let data = '';

  res.on('data', d => data += d.toString());

  res.on('end', () => fin(JSON.parse(data)));
}))); */

const MU_ENDPOINT = 'https://mu.openasar.dev';

const getManifest = async (useCache = true) => (useCache && _manifest) || (_manifest = await new Promise(fin => https.get(`${MU_ENDPOINT}/${platform}/${releaseChannel}/modules.json`, async res => {
  let data = '';

  res.on('data', d => data += d.toString());

  res.on('end', () => {
    const mods = JSON.parse(data);

    fin({
      modules: Object.keys(mods).reduce((acc, x) => {
        acc[x] = {
          full: {
            module_version: mods[x],
            url: `${MU_ENDPOINT}/${platform}/${releaseChannel}/${x}`
          }
        };

        return acc;
      }, {}),
      required_modules: []
    });
    // fin(JSON.parse(data))
  });
})));

const installModule = async (moduleName, _progressCallback = () => {}, force = false) => { // install module
  log('Updater', `Installing module ${moduleName}...`);
  const start = Date.now();

  const manifest = await getManifest();

  const remote = manifest.modules[moduleName].full;
  const version = remote.module_version;

  const installed = await getInstalled();

  if (!force && installed[moduleName] === version) {
    log('Updater', 'Aborting install of', moduleName, '- already installed!');
    return;
  }

  log('Updater', `Downloading ${moduleName}@${version}...`);

  const path = `${moduleName}-${version}`;

  const tarPath = join(pendingPath, path + '.tar');
  const finalPath = join(modulesPath, path, moduleName);

  // await fs.promises.mkdir(dirname(tarPath)).catch(_ => {});

  const stream = zlib.createBrotliDecompress();
  stream.pipe(fs.createWriteStream(tarPath));

  const progressCallback = (type, percent) => _progressCallback({
    state: percent === 100 ? 'Complete' : type,
    task: {
      ['Module' + type]: {
        package_sha256: moduleName,
        version: { module: { name: moduleName } }
      }
    },
    percent
  });

  let downloadTotal = 0, downloadCurrent = 0;
  https.get(remote.url, res => {
    res.pipe(stream);

    downloadTotal = parseInt(res.headers['content-length'] ?? 1, 10);

    res.on('data', c => {
      downloadCurrent += c.length;

      progressCallback('Download', (downloadCurrent / downloadTotal) * 100);
    });
  });

  await new Promise(res => stream.on('end', res));

  progressCallback('Download', 100);

  log('Updater', `Downloaded ${moduleName}@${version}`);

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

  log('Updater', `Installed ${moduleName}@${version}`);
  log('Updater', `Took ${(Date.now() - start).toFixed(2)}ms`);

  // fs.rm(tarPath, () => {}); // clean up downloaded tar after
  // getInstalled(false); // update cached installed after
};

const commitModules = async () => {

};

const queryCurrentVersions = async () => ({
  current_modules: await getInstalled()
});

const queryAndTruncateHistory = () => [];

const updateToLatestWithOptions = async (options, callback) => {
  const installed = await getInstalled(false);
  const manifest = await getManifest();

  const wanted = Object.keys(installed).concat(manifest.required_modules).filter((x, i, arr) => i === arr.indexOf(x)); // installed + required

  console.log('installed', installed);
  console.log('wanted', wanted);

  const installs = [];
  for (const m of wanted) {
    const local = installed[m] ?? -1;
    const remote = manifest.modules[m]?.full;

    const remoteVer = remote?.module_version;
    if (remoteVer && remoteVer > local) {
      log('Updater', 'Module update:', m, local, '->', remoteVer);
      installs.push(installModule(m, callback));
    }
  }

  const start = Date.now();
  await Promise.all(installs);
  if (installs.length > 0) log('Updater', `Updated ${installs.length} modules in ${(Date.now() - start).toFixed(2)}ms`);

  // await new Promise(res => setTimeout(res, 100000));
};

const startCurrentVersion = async () => {

};

fs.rmSync(pendingPath, { recursive: true, force: true });
fs.mkdirSync(pendingPath);

module.exports = {
  getUpdater: () => ({
    installModule,
    commitModules,
    queryCurrentVersions,
    queryAndTruncateHistory,
    updateToLatestWithOptions,

    startCurrentVersion,
    collectGarbage: () => {},

    valid: true
  }),

  tryInitUpdater: () => {}
};