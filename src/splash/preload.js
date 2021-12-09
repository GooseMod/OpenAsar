"use strict";

const {
  app,
  contextBridge,
  ipcRenderer
} = require('electron');

const {
  saferShellOpenExternal
} = require('../utils/securityUtils');

contextBridge.exposeInMainWorld('DiscordSplash', {
  getReleaseChannel: () => {
    const buildInfo = require('../utils/buildInfo');

    return buildInfo.releaseChannel;
  },
  signalReady: () => {
    ipcRenderer.send('DISCORD_SPLASH_SCREEN_READY');
  },
  onStateUpdate: callback => {
    ipcRenderer.on('DISCORD_SPLASH_UPDATE_STATE', (_, state) => {
      callback(state);
    });
  },
  onQuoteUpdate: callback => {
    ipcRenderer.on('DISCORD_SPLASH_SCREEN_QUOTE', (_, quote) => {
      callback(quote);
    });
  },
  openUrl: saferShellOpenExternal,
  quitDiscord: () => {
    ipcRenderer.send('DISCORD_SPLASH_SCREEN_QUIT');
  }
});