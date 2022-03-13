const updater = require('./updater');

const buildInfo = require('../utils/buildInfo');
const Constants = require('../Constants');

const { fatal, handled } = require('../errorHandler');
const splash = require('../splash');


exports.update = (startMin, done, show) => {
  if (updater.tryInitUpdater(buildInfo, Constants.NEW_UPDATE_ENDPOINT)) {
    const inst = updater.getUpdater();

    inst.on('host-updated', () => require('../autoStart').update(() => {}));
    inst.on('unhandled-exception', fatal);
    inst.on('InconsistentInstallerState', fatal);
    inst.on('update-error', handled);

    require('../firstRun').performFirstRunTasks(inst);
  } else {
    require('./moduleUpdater').init(Constants.UPDATE_ENDPOINT, require('../appSettings').getSettings(), buildInfo);
  }

  splash.initSplash(startMin);
  splash.events.once('APP_SHOULD_LAUNCH', done);
  splash.events.once('APP_SHOULD_SHOW', show);
};

exports.focusSplash = () => splash.focusWindow();