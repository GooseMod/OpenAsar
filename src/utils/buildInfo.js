// Use JSON parse for vaguely more security-ish
const fs = require('fs');
const { join } = require('path');

module.exports = JSON.parse(fs.readFileSync(join(process.resourcesPath, 'build_info.json'), 'utf8'));