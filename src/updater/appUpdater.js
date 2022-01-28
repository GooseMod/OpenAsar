const { init: moduleInit } = require('./moduleUpdater');
const updater = require('./updater');

const settings = require('../appSettings').getSettings();
const buildInfo = require('../utils/buildInfo');
const { UPDATE_ENDPOINT, NEW_UPDATE_ENDPOINT } = require('../Constants');

const { fatal, handled } = require('../errorHandler');
const { performFirstRunTasks } = require('../firstRun');
const { update: autostartUpdate } = require('../autoStart');
const { initSplash, focusWindow, APP_SHOULD_LAUNCH, APP_SHOULD_SHOW, events: splashEvents } = require('../splash');


exports.update = (startMin, done, show) => {
  if (updater.tryInitUpdater(buildInfo, NEW_UPDATE_ENDPOINT)) {
    const updater = updater.getUpdater();

    updater.on('host-updated', () => {
      autostartUpdate(() => {});
    });
    updater.on('unhandled-exception', fatal);
    updater.on(updater.INCONSISTENT_INSTALLER_STATE_ERROR, fatal);
    updater.on('update-error', handled);

    performFirstRunTasks(updater);
  } else {
    moduleInit(UPDATE_ENDPOINT, settings, buildInfo);
  }

  initSplash(startMin);
  splashEvents.once(APP_SHOULD_LAUNCH, done);
  splashEvents.once(APP_SHOULD_SHOW, show);
};

exports.focusSplash = () => focusWindow();