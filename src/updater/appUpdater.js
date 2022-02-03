const moduleUpdater = require('./moduleUpdater');
const updater = require('./updater');

const settings = require('../appSettings').getSettings();
const buildInfo = require('../utils/buildInfo');
const Constants = require('../Constants');

const { fatal, handled } = require('../errorHandler');
const firstRun = require('../firstRun');
const autoStart = require('../autoStart');
const splash = require('../splash');


exports.update = (startMin, done, show) => {
  if (updater.tryInitUpdater(buildInfo, Constants.NEW_UPDATE_ENDPOINT)) {
    const inst = updater.getUpdater();

    inst.on('host-updated', () => autoStart.update(() => {}));
    inst.on('unhandled-exception', fatal);
    inst.on(updater.INCONSISTENT_INSTALLER_STATE_ERROR, fatal);
    inst.on('update-error', handled);

    firstRun.performFirstRunTasks(inst);
  } else {
    moduleUpdater.init(Constants.UPDATE_ENDPOINT, settings, buildInfo);
  }

  splash.initSplash(startMin);
  splash.events.once(splash.APP_SHOULD_LAUNCH, done);
  splash.events.once(splash.APP_SHOULD_SHOW, show);
};

exports.focusSplash = () => splash.focusWindow();