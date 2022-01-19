// Discord uses require but we'll use JSON parse for vaguely more security-ish
const { readFileSync } = require('fs');
const { join } = require('path');

module.exports = JSON.parse(readFileSync(join(process.resourcesPath, 'build_info.json'), 'utf8'));