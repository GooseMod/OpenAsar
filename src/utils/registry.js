const CP = require('child_process');


exports.spawn = (args, cb) => CP.execFile('reg.exe', args, cb);

exports.add = (todo, cb) => {
  const x = todo.shift();
  if (!x) return cb();

  exports.spawn([ 'add', ...x, '/f' ], () => exports.add(todo, cb));
};