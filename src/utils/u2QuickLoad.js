const { readdirSync } = require('fs');
const { join } = require('path');
const Module = require('module');

const paths = require('../paths');


const modulesDir = join(paths.getExeDir(), 'modules');
const moduleDirs = readdirSync(modulesDir);

for (const dir of moduleDirs) { // General (load all)
  Module.globalPaths.push(join(modulesDir, dir));
}