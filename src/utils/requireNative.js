// Custom requireNative as Electron >=17 breaks Module.globalPaths for some reason
// For Updater v2: get direct path in globalPaths (g[0])
// For Module Updater: get root path for all modules in globalPaths

const g = require('module').globalPaths;
module.exports = (n, e = '') => require(require('path').join(g.reverse().find(x => x.includes(n)) ?? g[0], n, e));