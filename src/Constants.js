const p = 'Discord'; // Product name
const d = 'https://discord.com'; // Domain

const r = releaseChannel; // Release channel
const s = r === 'stable' ? '' : (r[0].toUpperCase() + r.slice(1)); // Suffix per release channel (stable = blank, canary = Canary, etc)
const n = p + s; // Name as Discord<Channel> (if not stable)


module.exports = {
  APP_COMPANY: p + ' Inc',
  APP_DESCRIPTION: p + ' - ' + d,
  APP_NAME: n,
  APP_NAME_FOR_HUMANS: (p + ' ' + s).trim(),
  APP_ID: [ 'com', 'squirrel', n, n ].join('.'),
  APP_PROTOCOL: p,
  API_ENDPOINT: settings.get('API_ENDPOINT') || (d + '/api'),
  NEW_UPDATE_ENDPOINT: settings.get('NEW_UPDATE_ENDPOINT') || 'https://updates.discord.com/',
  UPDATE_ENDPOINT: settings.get('UPDATE_ENDPOINT') || (d + '/api'),
  USE_RUST_BSPATCH: settings.get('USE_RUST_BSPATCH') || process.platform === 'darwin' || process.platform === 'linux',
  USE_NEW_UPDATER: settings.get('USE_NEW_UPDATER') || process.platform === 'win32' || process.platform === 'linux'
};
