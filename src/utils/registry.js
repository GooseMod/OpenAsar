const CP = require('child_process');


exports.spawn = (args, cb) => {
  const process = CP.spawn('reg.exe', args);
  let out = '';

  process.stdout.on('data', data => out += data);

  process.on('error', e => cb(e, out));
  process.on('exit', (c, s) => cb(c !== 0 ? (s ?? c) : null, out));
};

exports.add = (todo, cb) => {
  const x = todo.shift();
  if (!x) return cb();

  exports.spawn([ 'add', ...x, '/f' ], () => exports.add(todo, cb));
};