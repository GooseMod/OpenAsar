const { app } = require("electron");

exports.init = () => {
  /* process.on('uncaughtException', error => {
    const stack = error.stack ? error.stack : String(error);
    const message = `Uncaught exception:\n ${stack}`;
    console.warn(message);

    if (!isErrorSafeToSuppress(error)) {
      _electron.dialog.showErrorBox('A JavaScript error occurred in the main process', message);
    }
  }); */
};


exports.fatal = (err) => {
  const options = {
    type: 'error',
    message: 'A fatal Javascript error occured',
    detail: err && err.stack ? err.stack : String(err)
  };

  const callback = _ => app.quit();

  const electronMajor = parseInt(process.versions.electron.split('.')[0]);

  if (electronMajor >= 6) {
    _electron.dialog.showMessageBox(null, options).then(callback);
  } else {
    _electron.dialog.showMessageBox(options, callback);
  }

  log('ErrorHandler', 'Fatal:', err);
};

exports.handled = (err) => {
  log('ErrorHandler', 'Handled:', err);
};