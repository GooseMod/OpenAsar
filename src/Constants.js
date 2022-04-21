const r = releaseChannel; // Release channel
const s = r === 'stable' ? '' : (r[0].toUpperCase() + r.slice(1)); // Suffix per release channel (stable = blank, canary = Canary, etc)
const n = 'Discord' + s; // Name as Discord<Channel> (if not stable)


module.exports = {
  APP_COMPANY: 'Discord Inc',
  APP_DESCRIPTION: 'Discord - https://discord.com',
  APP_NAME: n,
  APP_NAME_FOR_HUMANS: 'Discord' + (s !== '' ? ' ' + s : ''),
  APP_ID: [ 'com', 'squirrel', n, n ].join('.'),
  APP_PROTOCOL: 'Discord',
  API_ENDPOINT: settings.get('API_ENDPOINT') || 'https://discord.com/api',
  NEW_UPDATE_ENDPOINT: settings.get('NEW_UPDATE_ENDPOINT') || 'https://discord.com/api/updates/',
  UPDATE_ENDPOINT: settings.get('UPDATE_ENDPOINT') || 'https://discord.com/api'
};