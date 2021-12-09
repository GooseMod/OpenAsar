const { BrowserWindow, app } = require('electron');

const { format } = require('url');
const { join } = require('path');

const ipcMain = require('../ipcMain');


const LOADING_WINDOW_WIDTH = 300;
const LOADING_WINDOW_HEIGHT = process.platform === 'darwin' ? 300 : 350; // TODO: addModulesListener events should use Module's constants

let window;

const APP_SHOULD_LAUNCH = 'APP_SHOULD_LAUNCH';
exports.APP_SHOULD_LAUNCH = APP_SHOULD_LAUNCH;
const APP_SHOULD_SHOW = 'APP_SHOULD_SHOW';
exports.APP_SHOULD_SHOW = APP_SHOULD_SHOW;
const events = new (require('events')).EventEmitter();

exports.events = events;

exports.initSplash = (startMinimized = false) => { // Make splash window
  const windowConfig = {
    width: LOADING_WINDOW_WIDTH,
    height: LOADING_WINDOW_HEIGHT,
    transparent: false,
    frame: false,
    resizable: false,
    center: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      enableRemoteModule: false,
      contextIsolation: true,
      preload: join(__dirname, 'preload.js')
    }
  };

  window = new BrowserWindow(windowConfig);

  window.on('closed', () => { // Quit app on splash screen close
    app.quit();
    window = null;
  });


  // IPC "handlers"
  ipcMain.on('SPLASH_SCREEN_READY', () => {
    if (!startMinimized && window) window.show();

    // Update and stuff

    events.emit(APP_SHOULD_LAUNCH);
  });

  if (!startMinimized && window) window.show();

  // Update and stuff

  events.emit(APP_SHOULD_LAUNCH);

  ipcMain.on('SPLASH_SCREEN_QUIT', () => {
    app.quit();
  });

  const splashUrl = format({
    protocol: 'file',
    slashes: true,
    pathname: join(__dirname, 'index.html')
  });

  window.loadURL(splashUrl);
};

exports.focusWindow = () => { // Focus splash window
  if (window) window.focus();
};

const killWindow = () => {
  if (!window) return;

  window.setSkipTaskbar(true);

  setTimeout(() => {
    window.hide();
    window.close();
    window = null;
  }, 100);
};

exports.pageReady = () => { // Kill splash window, emit
  killWindow();

  process.nextTick(() => events.emit(APP_SHOULD_SHOW));
};