const CP = require('child_process');


const spawn = (args, callback) => {
  let process, stdout = '';

  try {
    process = CP.spawn('reg.exe', args);
  } catch (e) {
    callback(e, stdout);
  }

  process.stdout.on('data', data => stdout += data);

  process.on('error', err => callback(err, stdout));

  process.on('exit', (code, signal) => callback(code !== 0 ? new Error('Spawn: ' + signal ?? code) : null, stdout));
};

const add = (todo, callback) => {
  const x = todo.shift();
  if (!x) return callback();

  spawn([ 'add', ...x, '/f' ], () => add(todo, callback));
};

module.exports = {
  spawn,
  add,

  installProtocol: (protocol, callback) => {
    const base = 'HKCU\\Software\\Classes\\' + protocol;
    add([[base, '/ve', '/d', `URL:${protocol} Protocol`], [base, '/v', 'URL Protocol'], [base + '\\DefaultIcon', '/ve', '/d', `"${process.execPath}",-1`], [base + '\\shell\\open\\command', '/ve', '/d', `"${process.execPath}" --url -- "%1"`]], callback);
  }
};