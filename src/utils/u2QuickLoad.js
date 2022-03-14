const { join } = require('path');
const Module = require('module');


const base = join(require('../paths').getExeDir(), 'modules');
for (const dir of require('fs').readdirSync(base)) {
  Module.globalPaths.push(join(base, dir));
}