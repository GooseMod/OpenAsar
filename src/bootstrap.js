const { app, session } = require('electron');
const { readFileSync } = require('fs');
const { readFile } = require('fs/promises');
const { join, dirname } = require('path');
const http = require('http');
const https = require('https');

if (!settings.get('enableHardwareAcceleration', true)) app.disableHardwareAcceleration();
process.env.PULSE_LATENCY_MSEC = process.env.PULSE_LATENCY_MSEC ?? 30;

const buildInfo = require('./utils/buildInfo');
app.setVersion(buildInfo.version); // More global because discord / electron
global.releaseChannel = buildInfo.releaseChannel;

log('BuildInfo', buildInfo);

const Constants = require('./Constants');
app.setAppUserModelId(Constants.APP_ID);

app.name = 'discord'; // Force name as sometimes breaks

const fatal = e => log('Fatal', e);
process.on('uncaughtException', console.error);


const splash = require('./splash');
const updater = require('./updater/updater');
const moduleUpdater = require('./updater/moduleUpdater');
const autoStart = require('./autoStart');

const fetchText = protocol => url => new Promise((resolve, reject) => {
  protocol.get(url, res => {
    if (res.statusCode !== 200) {
      return void reject(new Error(`CSS import failed, code ${res.statusCode}`));
    }
    let data = '';
    res.on('data', chunk => data += chunk);
    res.once('end', () => resolve(data));
  }).once('error', reject);
});

const httpFetchers = {
  'http:': fetchText(http),
  'https:': fetchText(https)
};

const importRegex = /@import\s+(?:url\()?\s*['"](.+?)['"]\s*(?:\))?\s*;/g;
const resolveImports = async (cssString, prevImport) => {
  const resolvedCss = await Promise.all(
    cssString.match(importRegex)?.map(async cssImport => {
      // Extract the URL from the import statement
      const importString = cssImport.match(/['"](.+?)['"]/)[1];

      // Try to parse the import string as a complete URL. If it fails, prepend the previous path and try again
      let url;
      try {
        url = new URL(importString);
      } catch {
        url = new URL(join(prevImport, importString));
      }

      let importedCss, fetcher;

      if (url.protocol === 'file:') {
        importedCss = (await readFile(url)).toString();
      } else if (fetcher = httpFetchers[url.protocol]) {
        importedCss = await fetcher(url).catch(() => `/* Import failed for: ${importString} */`);
      } else {
        throw new Error(`Cannot handle protocol ${url.protocol} for url: ${importString}!`)
      }

      return resolveImports(importedCss, dirname(importString));
    }) ?? []
  );

  cssString.match(importRegex)?.forEach((importStatement, index) => {
    cssString = cssString.replace(importStatement, resolvedCss[index]);
  });

  return cssString;
};

let desktopCore;
const startCore = async () => {
  if (oaConfig.js || oaConfig.css) session.defaultSession.webRequest.onHeadersReceived((d, cb) => {
    delete d.responseHeaders['content-security-policy'];
    cb(d);
  });

  const css = await resolveImports(oaConfig.css);

  app.on('browser-window-created', (e, bw) => { // Main window injection
    bw.webContents.on('dom-ready', () => {
      if (!bw.resizable) return; // Main window only
      splash.pageReady(); // Override Core's pageReady with our own on dom-ready to show main window earlier

      const [ channel = '', hash = '' ] = oaVersion.split('-'); // Split via -

      bw.webContents.executeJavaScript(readFileSync(join(__dirname, 'mainWindow.js'), 'utf8')
        .replaceAll('<hash>', hash).replaceAll('<channel>', channel)
        .replaceAll('<notrack>', oaConfig.noTrack !== false)
        .replaceAll('<domopt>', oaConfig.domOptimizer !== false)
        .replace('<css>', css.replaceAll('\\', '\\\\').replaceAll('`', '\\`')));

      if (oaConfig.js) bw.webContents.executeJavaScript(oaConfig.js);
    });
  });

  desktopCore = require('discord_desktop_core');

  desktopCore.startup({
    splashScreen: splash,
    moduleUpdater,
    buildInfo,
    Constants,
    updater,
    autoStart,

    // Just requires
    appSettings: require('./appSettings'),
    paths: require('./paths'),

    // Stubs
    GPUSettings: {
      replace: () => {}
    },
    crashReporterSetup: {
      isInitialized: () => true,
      getGlobalSentry: () => null,
      metadata: {}
    }
  });
};

const startUpdate = () => {
  const urls = [
    oaConfig.noTrack !== false ? 'https://*/api/*/science' : '',
    oaConfig.noTrack !== false ? 'https://*/api/*/metrics' : '',
    oaConfig.noTyping === true ? 'https://*/api/*/typing' : ''
  ].filter(x => x);

  if (urls.length > 0) session.defaultSession.webRequest.onBeforeRequest({ urls }, (e, cb) => cb({ cancel: true }));

  const startMin = process.argv?.includes?.('--start-minimized');

  if (updater.tryInitUpdater(buildInfo, Constants.NEW_UPDATE_ENDPOINT)) {
    const inst = updater.getUpdater();

    inst.on('host-updated', () => autoStart.update(() => {}));
    inst.on('unhandled-exception', fatal);
    inst.on('InconsistentInstallerState', fatal);
    inst.on('update-error', console.error);

    require('./winFirst').do();
  } else {
    moduleUpdater.init(Constants.UPDATE_ENDPOINT, buildInfo);
  }

  splash.events.once('APP_SHOULD_LAUNCH', () => {
    if (!process.env.OPENASAR_NOSTART) startCore();
  });

  let done;
  splash.events.once('APP_SHOULD_SHOW', () => {
    if (done) return;
    done = true;

    desktopCore.setMainWindowVisible(!startMin);

    setTimeout(() => { // Try to update our asar
      const config = require('./config');
      if (oaConfig.setup !== true) config.open();

      if (oaConfig.autoupdate !== false) {
        try {
          require('./asarUpdate')();
        } catch (e) {
          log('AsarUpdate', e);
        }
      }
    }, 3000);
  });

  splash.initSplash(startMin);
};


module.exports = () => {
  app.on('second-instance', (e, a) => {
    desktopCore?.handleOpenUrl?.(a.includes('--url') && a[a.indexOf('--') + 1]); // Change url of main window if protocol is used (uses like "discord --url -- discord://example")
  });

  if (!app.requestSingleInstanceLock() && !(process.argv?.includes?.('--multi-instance') || oaConfig.multiInstance === true)) return app.quit();

  app.whenReady().then(startUpdate);
};