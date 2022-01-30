const { shell } = require('electron');

const allowedProtocols = [ 'https', 'http' ]; // Only allow some protocols
exports.saferShellOpenExternal = (url) => allowedProtocols.includes(url.split(':')[0].toLowerCase()) ? shell.openExternal(url) : Promise.reject();

const oParse = (u) => u.split('/').slice(0, 3).join('/');
exports.checkUrlOriginMatches = (a, b) => oParse(a) === oParse(b);