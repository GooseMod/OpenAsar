const { shell } = require('electron');

const BLOCKED_URL_PROTOCOLS = ['file:', 'javascript:', 'vbscript:', 'data:', 'about:', 'chrome:', 'ms-cxh:', 'ms-cxh-full:', 'ms-word:']; // From Discord
const allowedProtocols = [ 'https:', 'http:' ];

exports.saferShellOpenExternal = (url) => {
  let parsed;

  try {
    parsed = new URL(url);
  } catch (_e) { return Promise.reject(); }

  const protocol = parsed.protocol?.toLowerCase();

  let disallowed = false;
  if (oaConfig.ssoeAllowlist === false) { // Allow config option to use traditional Discord check for compatibility
    if (!protocol || BLOCKED_URL_PROTOCOLS.includes(protocol)) disallowed = true;
  } else {
    if (!allowedProtocols.includes(protocol)) disallowed = true;
  }

  if (disallowed) return Promise.reject();

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