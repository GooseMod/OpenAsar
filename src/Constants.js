const p = 'Discord'; // Product name

const r = releaseChannel; // Release channel
const n = p + (r === 'stable' ? '' : (r[0].toUpperCase() + r.slice(1))); // Name as Discord<Channel> (if not stable)


module.exports = {
  APP_NAME: n,
  APP_ID: [ 'com', 'squirrel', n, n ].join('.'),
  API_ENDPOINT: settings.get('API_ENDPOINT') ?? 'https://discord.com/api'
};