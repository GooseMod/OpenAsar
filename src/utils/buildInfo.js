// Use JSON parse for vaguely more security-ish
module.exports = JSON.parse(require('fs').readFileSync(require('path').join(process.resourcesPath, 'build_info.json'), 'utf8'));