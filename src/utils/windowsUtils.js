const child_process = require('child_process');
const { join } = require('path');

const sr = process.env.SystemRoot;
const regExePath = join(sr || '', sr ? 'System32' : '', 'reg.exe'); // %SystemRoot%\System32\reg.exe OR reg.exe if SR is undefined

const spawn = (cmd, args, callback = (() => {})) => {
  let process, stdout = '';

  try {
    process = child_process.spawn(cmd, args);
  } catch (e) {
    callback(e, stdout);
  }

  process.stdout.on('data', data => stdout += data);

  process.on('error', err => callback(err, stdout));

  process.on('exit', (code, signal) => callback(code !== 0 ? new Error('Spawn returned: ' + signal ?? code) : null, stdout));
};

const spawnReg = (args, callback) => spawn(regExePath, args, callback);

const addToRegistry = (queue, callback = (() => {})) => {
  const args = queue.shift();
  if (!args) return callback();

  args.unshift('add');
  args.push('/f');

  return spawnReg(args, () => addToRegistry(queue, callback));
};

module.exports = { spawn, spawnReg, addToRegistry };