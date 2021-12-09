// Bootstrap consts, heavily copied as don't want to mess with it
const { releaseChannel } = require('./utils/buildInfo');

const { getSettings } = require('./appSettings');

const settings = getSettings();

function capitalizeFirstLetter(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const appNameSuffix = releaseChannel === 'stable' ? '' : capitalizeFirstLetter(releaseChannel);
const APP_COMPANY = 'Discord Inc';
const APP_DESCRIPTION = 'Discord - https://discord.com';
const APP_NAME = 'Discord' + appNameSuffix;
const APP_NAME_FOR_HUMANS = 'Discord' + (appNameSuffix !== '' ? ' ' + appNameSuffix : '');
const APP_ID_BASE = 'com.squirrel';
const APP_ID = `${APP_ID_BASE}.${APP_NAME}.${APP_NAME}`;
const APP_PROTOCOL = 'Discord';
const API_ENDPOINT = settings.get('API_ENDPOINT') || 'https://discord.com/api';
const UPDATE_ENDPOINT = settings.get('UPDATE_ENDPOINT') || API_ENDPOINT;
const NEW_UPDATE_ENDPOINT = settings.get('NEW_UPDATE_ENDPOINT') || 'https://discord.com/api/updates/';

module.exports = {
  APP_COMPANY,
  APP_DESCRIPTION,
  APP_NAME,
  APP_NAME_FOR_HUMANS,
  APP_ID,
  APP_PROTOCOL,
  API_ENDPOINT,
  NEW_UPDATE_ENDPOINT,
  UPDATE_ENDPOINT
};