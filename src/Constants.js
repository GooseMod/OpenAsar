const titleCase = s => s[0].toUpperCase() + s.slice(1);

const appNameSuffix = releaseChannel === 'stable' ? '' : titleCase(releaseChannel);
const APP_NAME = 'Discord' + appNameSuffix;


module.exports = {
  APP_COMPANY: 'Discord Inc',
  APP_DESCRIPTION: 'Discord - https://discord.com',
  APP_NAME,
  APP_NAME_FOR_HUMANS: 'Discord' + (appNameSuffix !== '' ? ' ' + appNameSuffix : ''),
  APP_ID: [ 'com', 'squirrel', APP_NAME, APP_NAME ].join('.'),
  APP_PROTOCOL: 'Discord',
  API_ENDPOINT: settings.get('API_ENDPOINT') || 'https://discord.com/api',
  NEW_UPDATE_ENDPOINT: settings.get('NEW_UPDATE_ENDPOINT') || 'https://discord.com/api/updates/',
  UPDATE_ENDPOINT: settings.get('UPDATE_ENDPOINT') || 'https://discord.com/api'
};