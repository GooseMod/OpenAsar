const child_process = require('child_process');
const { join } = require('path');

const regExePath = process.env.SystemRoot ? join(process.env.SystemRoot, 'System32', 'reg.exe') : 'reg.exe';

const spawn = (cmd, args, callback = (() => {})) => {
  let stdout = '';
  let process;

  try {
    process = child_process.spawn(cmd, args);
  } catch (e) {
    callback(e, stdout);
  }

  process.stdout.on('data', data => {
    stdout += data;
  });

  process.on('error', err => { callback(err, stdout); });

  process.on('exit', (code, signal) => {
    let err = null;
    if (code !== 0) {
      err = new Error('Command failed: ' + (signal || code));

      err.code = err.code || code;
      err.stdout = err.stdout || stdout;
    }

    callback(err, stdout);
  });
};

const spawnReg = (args, callback) => spawn(regExePath, args, callback);

const addToRegistry = (queue, callback) => {
  if (queue.length === 0) {
    return callback && callback();
  }

  const args = queue.shift();
  args.unshift('add');
  args.push('/f');
  return spawnReg(args, () => addToRegistry(queue, callback));
};

module.exports = { spawn, spawnReg, addToRegistry };