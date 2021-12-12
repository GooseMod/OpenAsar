const { app, dialog } = require("electron");

exports.init = () => {
  process.on('uncaughtException', error => {
    const stack = error.stack ? error.stack : String(error);
    const message = `Uncaught exception:\n${stack}`;
    console.warn(message);

    // _electron.dialog.showErrorBox('A JavaScript error occurred in the main process', message);
  });

  log('ErrorHandler', 'Inited');
};


exports.fatal = (err) => {
  const options = {
    type: 'error',
    message: 'A fatal Javascript error occured',
    detail: err && err.stack ? err.stack : String(err)
  };

  dialog.showMessageBox(null, options).then(() => app.quit());

  log('ErrorHandler', 'Fatal:', err);
};

exports.handled = (err) => {
  log('ErrorHandler', 'Handled:', err);
};