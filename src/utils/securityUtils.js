const { shell } = require('electron');

const allowedProtocols = [ 'https:', 'http:' ];
exports.saferShellOpenExternal = (url) => {
  let parsed;

  try {
    parsed = new URL(url);
  } catch (_e) { return Promise.reject(); }

  if (!allowedProtocols.includes(parsed.protocol?.toLowerCase())) return Promise.reject(); // Only allow some protocols

  return shell.openExternal(url);
};

exports.checkUrlOriginMatches = (url1, url2) => {
  let parse1, parse2;

  try {
    parse1 = new URL(url1);
    parse2 = new URL(url2);
  } catch (_e) { return Promise.reject(); }

  return parse1.protocol === parse2.protocol && parse1.host === parse2.host;
};