module.exports = (moduleName) => {
  const NodeModule = require('module');

  const modulesDir = _path.default.join(paths.getExeDir(), 'modules');
  const moduleCoreDir = _fs.default.readdirSync(modulesDir).find((x) => x.startsWith(moduleName + '-')); // Find desktop core dir by name

  NodeModule.globalPaths.push(_path.default.join(modulesDir, moduleCoreDir)); // Add to globalPaths for requiring
};