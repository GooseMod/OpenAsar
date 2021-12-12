const { readdirSync } = require('fs');
const { join } = require('path');
const NodeModule = require('module');

const paths = require('../paths');


module.exports = (moduleName) => { // If undefined, load all
  const modulesDir = join(paths.getExeDir(), 'modules');
  const moduleDirs = readdirSync(modulesDir);

  if (moduleName) {
    const moduleCoreDir = moduleDirs.find((x) => x.startsWith(moduleName + '-')); // Find desktop core dir by name

    return NodeModule.globalPaths.push(join(modulesDir, moduleCoreDir)); // Add to globalPaths for requiring
  }

  // Undefined moduleName, load all
  for (const dir of moduleDirs) {
    NodeModule.globalPaths.push(join(modulesDir, dir));
  }
};