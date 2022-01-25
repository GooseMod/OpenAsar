// Jank replacement for yauzl by just using unzip where it expects and skipping (speed++, size--, jank++)
const { execFile } = require('child_process');
const { mkdirSync } = require('fs');
const { join, basename } = require('path');

exports.open = async (zipPath, _options, callback) => {
  const extractPath = join(global.moduleDataPath, basename(zipPath).split('.')[0].split('-')[0]);
  const listeners = [];
  log('Yauzl', 'Zip path:', zipPath, 'Extract path:', extractPath);

  const errorOut = (err) => {
    listeners.error(err);
  };

  callback(null, {
    on: (event, listener) => {
      listeners[event] = listener;
    },

    readEntry: () => {}, // Stubs as not used
    openReadStream: () => {},
    close: () => {}
  });

  mkdirSync(extractPath, { recursive: true });

  const proc = execFile('unzipp', ['-o', zipPath.replaceAll('"', ''), '-d', extractPath]);
  log('Yauzl', 'Spawned');

  proc.stderr.on('data', (data) => {
    errorOut(data.toString());
  });

  proc.on('error', (err) => {
    if (err.code === 'ENOENT') {
      require('electron').dialog.showErrorBox('Failed Dependency', 'Please install "unzip", exiting');
      process.exit(1); // Close now
    }

    errorOut(err);
  });

  proc.on('close', async () => {
    log('Yauzl', 'Closed');
    listeners.end();
  });
};