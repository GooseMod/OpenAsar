const CP = require('child_process');

module.exports = (args, cb) => CP.execFile('reg.exe', args, cb);