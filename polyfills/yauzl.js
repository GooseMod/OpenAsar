// Jank replacement for yauzl by just using unzip where it expects and skipping (speed++, size--)
const { spawn } = require('child_process');
const { createReadStream, mkdirSync, rmdirSync } = require('original-fs');
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

    readEntry: () => {},
    openReadStream: () => {},
    close: () => {}
  });

  mkdirSync(extractPath, { recursive: true });

  // const proc = spawn('tar', ['-v', '-xf', `"${zipPath.replaceAll('"', '')}"`, '-C', `"${extractPath}"`]);
  const proc = spawn('unzip', ['-o', `${zipPath.replaceAll('"', '')}`, '-d', `${extractPath}`]);
  console.log('spawn');
  proc.stdout.on('data', (data) => {
  });

  proc.stderr.on('data', (data) => {
    console.log('stderr', data.toString());
    errorOut(data.toString());
  });

  proc.on('error', (err) => {
    errorOut(err);
  });

  proc.on('close', async () => {
    finishedExtract = true;
    console.log('close');
    listeners.end();
  });
};