// Minimal wrapper mimicking mkdirp package
const F = require('fs');

const M = (p, c) => { // async
  F.mkdir(p, { recursive: true }, () => c()); // Never error
};

M.sync = (p) => { // sync
  try {
    F.mkdirSync(p, { recursive: true });
  } catch { } // Never error
};

module.exports = M;