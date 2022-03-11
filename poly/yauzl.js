// Jank replacement for yauzl by just using unzip where it expects and skipping (speed++, size--, jank++)
const { execFile } = require('child_process');
const mkdirp = require('mkdirp');

exports.open = async (zipPath, _opts, callback) => {
  const extractPath = `${global.moduleDataPath}/${zipPath.split('/').pop().split('.')[0].split('-')[0])}`;
  const listeners = [];

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

  mkdirp.sync(extractPath);

  const proc = execFile('unzip', ['-q', '-o', zipPath, '-d', extractPath]);

  proc.stderr.on('data', errorOut);

  proc.on('error', (err) => {
    if (err.code === 'ENOENT') {
      require('electron').dialog.showErrorBox('Failed Dependency', 'Please install "unzip", exiting');
      process.exit(1); // Close now
    }

    errorOut(err);
  });

  proc.on('close', () => listeners.end());
};