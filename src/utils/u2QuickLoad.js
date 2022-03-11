const { readdirSync } = require('fs');
const { join } = require('path');
const Module = require('module');

const paths = require('../paths');

const base = join(paths.getExeDir(), 'modules');
for (const dir of readdirSync(base)) {
  Module.globalPaths.push(join(base, dir));
}