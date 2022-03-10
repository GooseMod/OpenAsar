const child_process = require('child_process');
const { join } = require('path');

const sr = process.env.SystemRoot;
const regExe = join(sr || '', sr ? 'System32' : '', 'reg.exe'); // %SystemRoot%\System32\reg.exe OR reg.exe if SR is undefined


const spawn = (args, callback = (() => {})) => {
  let process, stdout = '';

  try {
    process = child_process.spawn(regExe, args);
  } catch (e) {
    callback(e, stdout);
  }

  process.stdout.on('data', data => stdout += data);

  process.on('error', err => callback(err, stdout));

  process.on('exit', (code, signal) => callback(code !== 0 ? new Error('Spawn: ' + signal ?? code) : null, stdout));
};

const add = (queue, callback = (() => {})) => {
  const args = queue.shift();
  if (!args) return callback();

  args.unshift('add');
  args.push('/f');

  return spawn(args, () => add(queue, callback));
};

module.exports = {
  spawn,
  add
};