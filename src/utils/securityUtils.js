const { shell } = require('electron');

const allowedProtocols = [ 'https', 'http' ]; // Only allow some protocols
exports.saferShellOpenExternal = (url) => allowedProtocols.includes(url.split(':')[0].toLowerCase()) ? shell.openExternal(url) : Promise.reject();

exports.checkUrlOriginMatches = (url1, url2) => {
  let parse1, parse2;

  try {
    parse1 = new URL(url1);
    parse2 = new URL(url2);
  } catch (_e) { return Promise.reject(); }

  return parse1.protocol === parse2.protocol && parse1.host === parse2.host;
};