if ('<notrack>' === 'true') { // Disable sentry
  try {
    window.__SENTRY__.hub.getClient().getOptions().enabled = false;

    Object.keys(console).forEach(x => console[x] = console[x].__sentry_original__ ?? console[x]);
  } catch { }
}

let lastBgPrimary = '';
const themesync = async () => {
  const getVar = (name, el = document.body) => el && (getComputedStyle(el).getPropertyValue(name) || getVar(name, el.parentElement))?.trim();

  const bgPrimary = getVar('--background-primary');
  if (!bgPrimary || bgPrimary === '#36393f' || bgPrimary === '#fff' || bgPrimary === lastBgPrimary) return; // Default primary bg or same as last
  lastBgPrimary = bgPrimary;

  const vars = [ '--background-primary', '--background-secondary', '--brand-experiment', '--header-primary', '--text-muted' ];

  let cached = await DiscordNative.userDataCache.getCached() || {};

  const value = `body { ${vars.reduce((acc, x) => acc += `${x}: ${getVar(x)}; `, '')} }`;
  const pastValue = cached['openasarSplashCSS'];
  cached['openasarSplashCSS'] = value;

  if (value !== pastValue) DiscordNative.userDataCache.cacheUserData(JSON.stringify(cached));
};

// Settings injection
const injectSettings = () => {
  console.log("Injection settings triggered 1");
  const sidebar = document.querySelector('[data-list-id="settings-sidebar"]');
  if (!sidebar) return;

  // Version info
  if (!document.getElementById('openasar-ver')) {
    console.log("Injection settings triggered 2");
    const footer = sidebar.lastElementChild;
    const versionInfo = footer?.firstElementChild;

    if (versionInfo) {
      console.log("Injection settings triggered 3");
      const oaVersionInfo = versionInfo.cloneNode(true);
      const oaVersion = oaVersionInfo.firstElementChild ?? oaVersionInfo;

      oaVersion.id = 'openasar-ver';
      oaVersion.textContent = 'OpenAsar (<hash>)';
      oaVersion.onclick = () => DiscordNative.ipc.send('DISCORD_UPDATED_QUOTES', 'o');

      oaVersionInfo.textContent = '';
      oaVersionInfo.appendChild(oaVersion);
      footer.insertAdjacentElement('beforebegin', oaVersionInfo);
    }
  }

  // Sidebar entry
  if (document.getElementById('openasar-item')) return;

  const advanced = document.querySelector('[data-settings-sidebar-item="advanced_panel"]');
  if (!advanced) return;

  const oaSetting = advanced.cloneNode(true);
  oaSetting.id = 'openasar-item';
  oaSetting.dataset.settingsSidebarItem = 'openasar_panel';

  const item = oaSetting.querySelector('[role="listitem"]') ?? oaSetting;
  const text = item.querySelector('span, div');

  if (text) text.textContent = 'OpenAsar';
  item.onclick = () => DiscordNative.ipc.send('DISCORD_UPDATED_QUOTES', 'o');

  advanced.insertAdjacentElement('afterend', oaSetting);
};

(function observeSettings() {
  const sidebar = document.querySelector('[data-list-id="settings-sidebar"]');
  if (!sidebar) return setTimeout(observeSettings, 500);

  new MutationObserver(injectSettings).observe(sidebar, {
    childList: true,
    subtree: true
  });

  injectSettings();
})();

const injCSS = x => {
  const el = document.createElement('style');
  el.appendChild(document.createTextNode(x));
  document.body.appendChild(el);
};

injCSS(`<css>`);

// Define global for any mods which want to know / etc
openasar = {};

// Try init themesync
setInterval(() => {
  try {
    themesync();
  } catch (e) { }
}, 10000);
themesync();

// DOM Optimizer - https://github.com/GooseMod/OpenAsar/wiki/DOM-Optimizer
const optimize = orig => function(...args) {
  if (typeof args[0].className === 'string' && (args[0].className.indexOf('activity') !== -1))
    return setTimeout(() => orig.apply(this, args), 100);

  return orig.apply(this, args);
};

if ('<domopt>' === 'true') {
  Element.prototype.removeChild = optimize(Element.prototype.removeChild);
  // Element.prototype.appendChild = optimize(Element.prototype.appendChild);
}
