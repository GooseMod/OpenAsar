// Depends on platform
switch (process.platform) {
  case 'win32':
    module.exports = require('./win32.js');
    break;
  
  case 'linux':
    module.exports = require('./linux.js');
    break;
  
  default:
    module.exports = require('./stub.js');
}