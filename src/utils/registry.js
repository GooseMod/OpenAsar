const CP = require('child_process');


exports.spawn = (args, callback) => {
  const process = CP.spawn('reg.exe', args);
  let out = '';

  process.stdout.on('data', data => out += data);

  process.on('error', e => callback(e, out));
  process.on('exit', (c, s) => callback(c !== 0 ? (s ?? c) : null, out));
};

exports.add = (todo, callback) => {
  const x = todo.shift();
  if (!x) return callback();

  exports.spawn([ 'add', ...x, '/f' ], () => exports.add(todo, callback));
};