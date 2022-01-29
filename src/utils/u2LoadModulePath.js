const { readdirSync } = require('fs');
const { join } = require('path');
const NodeModule = require('module');

const paths = require('../paths');


module.exports = (moduleName) => {
  const modulesDir = join(paths.getExeDir(), 'modules');
  const moduleDirs = readdirSync(modulesDir);

  if (moduleName) return NodeModule.globalPaths.push(join(modulesDir, moduleDirs.find((x) => x.startsWith(moduleName + '-')))); // Specific

  for (const dir of moduleDirs) { // General (load all)
    NodeModule.globalPaths.push(join(modulesDir, dir));
  }
};