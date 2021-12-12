const { readdirSync } = require('fs');
const { join } = require('path');
const NodeModule = require('module');

const paths = require('../paths');


module.exports = (moduleName) => {
  const modulesDir = join(paths.getExeDir(), 'modules');
  const moduleCoreDir = readdirSync(modulesDir).find((x) => x.startsWith(moduleName + '-')); // Find desktop core dir by name

  NodeModule.globalPaths.push(join(modulesDir, moduleCoreDir)); // Add to globalPaths for requiring
};