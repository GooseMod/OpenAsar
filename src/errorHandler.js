const { app, dialog } = require("electron");

exports.init = () => {
  process.on('uncaughtException', err => {
    const stack = err.stack ?? String(err);
    console.warn(stack);

    // dialog.showErrorBox('A JavaScript error occurred in the main process', message);
  });
};


exports.fatal = (err) => {
  log('ErrorHandler', 'Fatal:', err);

  dialog.showMessageBox(null, {
    type: 'error',
    message: 'A fatal Javascript error occured',
    detail: err?.stack ?? String(err)
  }).then(() => app.quit());
};

exports.handled = (err) => {
  log('ErrorHandler', 'Handled:', err);
};