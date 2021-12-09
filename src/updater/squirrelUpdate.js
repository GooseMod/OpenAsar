"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.spawnUpdateInstall = spawnUpdateInstall;
exports.spawnUpdate = spawnUpdate;
exports.installProtocol = installProtocol;
exports.handleStartupEvent = handleStartupEvent;
exports.updateExistsSync = updateExistsSync;
exports.restart = restart;

var _child_process = _interopRequireDefault(require("child_process"));

var _fs = _interopRequireDefault(require("fs"));

var _path = _interopRequireDefault(require("path"));

var autoStart = _interopRequireWildcard(require("../autoStart"));

var windowsUtils = _interopRequireWildcard(require("./windowsUtils"));

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// citron note: this assumes the execPath is in the format Discord/someVersion/Discord.exe
const appFolder = _path.default.resolve(process.execPath, '..');

const rootFolder = _path.default.resolve(appFolder, '..');

const exeName = _path.default.basename(process.execPath);

const updateExe = _path.default.join(rootFolder, 'Update.exe'); // Specialized spawn function specifically used for spawning the updater in
// update mode. Calls back with progress percentages.
// Returns Promise.


function spawnUpdateInstall(updateUrl, progressCallback) {
  return new Promise((resolve, reject) => {
    const proc = _child_process.default.spawn(updateExe, ['--update', updateUrl]);

    proc.on('error', reject);
    proc.on('exit', code => {
      if (code !== 0) {
        return reject(new Error(`Update failed with exit code ${code}`));
      }

      return resolve();
    });
    let lastProgress = -1;

    function parseProgress() {
      const lines = stdout.split(/\r?\n/);
      if (lines.length === 1) return; // return the last (possibly incomplete) line to stdout for parsing again

      stdout = lines.pop();
      let currentProgress;

      for (const line of lines) {
        if (!/^\d\d?$/.test(line)) continue;
        const progress = Number(line); // make sure that this number is steadily increasing

        if (lastProgress > progress) continue;
        currentProgress = progress;
      }

      if (currentProgress == null) return;
      lastProgress = currentProgress;
      progressCallback(Math.min(currentProgress, 100));
    }

    let stdout = '';
    proc.stdout.on('data', chunk => {
      stdout += String(chunk);
      parseProgress();
    });
  });
} // Spawn the Update.exe with the given arguments and invoke the callback when
// the command completes.


function spawnUpdate(args, callback) {
  windowsUtils.spawn(updateExe, args, callback);
} // Create a desktop and start menu shortcut by using the command line API
// provided by Squirrel's Update.exe


function createShortcuts(callback, updateOnly) {
  // move icon out to a more stable location, to keep shortcuts from breaking as much
  const icoSrc = _path.default.join(appFolder, 'app.ico');

  const icoDest = _path.default.join(rootFolder, 'app.ico');

  let icoForTarget = icoDest;

  try {
    const ico = _fs.default.readFileSync(icoSrc);

    _fs.default.writeFileSync(icoDest, ico);
  } catch (e) {
    // if we can't write there for some reason, just use the source.
    icoForTarget = icoSrc;
  }

  const createShortcutArgs = ['--createShortcut', exeName, '--setupIcon', icoForTarget];

  if (updateOnly) {
    createShortcutArgs.push('--updateOnly');
  }

  spawnUpdate(createShortcutArgs, callback);
} // Add a protocol registration for this application.


function installProtocol(protocol, callback) {
  const queue = [['HKCU\\Software\\Classes\\' + protocol, '/ve', '/d', `URL:${protocol} Protocol`], ['HKCU\\Software\\Classes\\' + protocol, '/v', 'URL Protocol'], ['HKCU\\Software\\Classes\\' + protocol + '\\DefaultIcon', '/ve', '/d', '"' + process.execPath + '",-1'], ['HKCU\\Software\\Classes\\' + protocol + '\\shell\\open\\command', '/ve', '/d', `"${process.execPath}" --url -- "%1"`]];
  windowsUtils.addToRegistry(queue, callback);
}

function terminate(app) {
  app.quit();
  process.exit(0);
} // Remove the desktop and start menu shortcuts by using the command line API
// provided by Squirrel's Update.exe


function removeShortcuts(callback) {
  spawnUpdate(['--removeShortcut', exeName], callback);
} // Update the desktop and start menu shortcuts by using the command line API
// provided by Squirrel's Update.exe


function updateShortcuts(callback) {
  createShortcuts(callback, true);
} // Purge the protocol for this applicationstart.


function uninstallProtocol(protocol, callback) {
  windowsUtils.spawnReg(['delete', 'HKCU\\Software\\Classes\\' + protocol, '/f'], callback);
}

function maybeInstallNewUpdaterSeedDb() {
  const installerDbSrc = _path.default.join(appFolder, 'installer.db');

  const installerDbDest = _path.default.join(rootFolder, 'installer.db');

  if (_fs.default.existsSync(installerDbSrc)) {
    _fs.default.renameSync(installerDbSrc, installerDbDest);
  }
} // Handle squirrel events denoted by --squirrel-* command line arguments.
// returns `true` if regular startup should be prevented


function handleStartupEvent(protocol, app, squirrelCommand) {
  switch (squirrelCommand) {
    case '--squirrel-install':
      createShortcuts(() => {
        autoStart.install(() => {
          installProtocol(protocol, () => {
            // Squirrel doesn't have a way to include app-level files.
            // We get around this for new updater hosts, which rely on
            // a seeded manifest, by bubbling the db up from the versioned-app
            // directory if it exists.
            maybeInstallNewUpdaterSeedDb();
            terminate(app);
          });
        });
      }, false);
      return true;

    case '--squirrel-updated':
      updateShortcuts(() => {
        autoStart.update(() => {
          installProtocol(protocol, () => {
            terminate(app);
          });
        });
      });
      return true;

    case '--squirrel-uninstall':
      removeShortcuts(() => {
        autoStart.uninstall(() => {
          uninstallProtocol(protocol, () => {
            terminate(app);
          });
        });
      });
      return true;

    case '--squirrel-obsolete':
      terminate(app);
      return true;

    default:
      return false;
  }
} // Are we using Squirrel for updates?


function updateExistsSync() {
  return _fs.default.existsSync(updateExe);
} // Restart app as the new version


function restart(app, newVersion) {
  app.once('will-quit', () => {
    const execPath = _path.default.resolve(rootFolder, `app-${newVersion}/${exeName}`);

    _child_process.default.spawn(execPath, [], {
      detached: true
    });
  });
  app.quit();
}