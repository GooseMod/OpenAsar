const { app, dialog } = require("electron");


exports.fatal = (e) => dialog.showMessageBox({
  type: 'error',
  message: 'A fatal Javascript error occured',
  detail: e?.stack ?? String(e)
}).then(() => app.quit());