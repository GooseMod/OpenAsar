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
const openOpenAsarSettings = () => DiscordNative.ipc.send('DISCORD_UPDATED_QUOTES', 'o');
const firstNode = (...getters) => {
  for (const getter of getters) {
    const node = getter();
    if (node) return node;
  }
};

const sidebarHasSettingsMarkers = sidebar => !!sidebar && firstNode(
  () => sidebar.querySelector('[data-settings-sidebar-item]'),
  () => sidebar.querySelector('[data-list-item-id^="settings-sidebar___"]'),
  () => sidebar.parentElement?.querySelector('.bd-version-info'),
  () => sidebar.querySelector('[class*="compactInfo"]'),
  () => sidebar.querySelector('[aria-label="User Settings"]'),
  () => sidebar.querySelector('[aria-label="App Settings"]')
);

const findSettingsSidebar = () => {
  const candidates = [
    ...document.querySelectorAll('[data-list-id="settings-sidebar"]'),
    ...document.querySelectorAll('[class*="sidebar"] [class*="nav"]')
  ];

  return candidates.find(sidebarHasSettingsMarkers);
};

const findVersionInfo = () => firstNode(
  () => document.querySelector('.bd-version-info > div:nth-child(2)'),
  () => document.querySelector('.bd-version-info'),
  () => document.querySelector('[class*="sidebar"] [class*="compactInfo"]'),
  () => [...document.querySelectorAll('[class*="sidebar"] [class*="info"] [class*="line"]')].find(x => x.textContent?.startsWith('Host '))
);

const findAdvancedItem = () => {
  const sidebar = findSettingsSidebar();
  return firstNode(
    () => sidebar?.querySelector('[data-list-item-id="settings-sidebar___advanced_sidebar_item"]'),
    () => sidebar?.querySelector('[data-list-item-id*="advanced"]'),
    () => sidebar?.querySelector('[data-settings-sidebar-item="advanced_panel"]')?.querySelector('[class*="item"]'),
    () => sidebar?.querySelector('[data-settings-sidebar-item="developer_panel"] [role="listitem"]'),
    () => sidebar?.querySelector('[data-list-item-id="settings-sidebar___developer_sidebar_item"]'),
    () => sidebar?.querySelector('[data-list-item-id="settings-sidebar___logout_sidebar_item"]'),
    () => {
      const item = sidebar?.querySelector('[data-settings-sidebar-item="betterdiscord_settings_panel"]');
      return item?.previousElementSibling?.querySelector?.('[role="listitem"]') ?? item?.querySelector?.('[role="listitem"]');
    },
    () => document.querySelector('[data-tab-id="Advanced"]'),
    () => [...(sidebar?.querySelectorAll('[class*="item"]') ?? [])].find(x => x.textContent === 'Advanced'),
    () => [...document.querySelectorAll('[class*="item"]')].find(x => x.textContent === 'Advanced')
  );
};

const injectVersionInfo = () => {
  if (document.getElementById('openasar-ver')) return;

  const versionInfo = findVersionInfo();
  if (!versionInfo) return;

  const oaVersionInfo = versionInfo.cloneNode(true);
  const oaVersion = oaVersionInfo.children?.[0] ?? oaVersionInfo;
  oaVersion.id = 'openasar-ver';
  oaVersion.textContent = 'OpenAsar <channel> (<hash>)';
  oaVersion.onclick = openOpenAsarSettings;

  if (oaVersionInfo !== oaVersion) {
    oaVersionInfo.textContent = '';
    oaVersionInfo.appendChild(oaVersion);
  }

  const versionTarget = versionInfo.parentElement?.parentElement?.lastElementChild;
  if (versionTarget) versionTarget.insertAdjacentElement('beforebegin', oaVersionInfo);
  else versionInfo.insertAdjacentElement('afterend', oaVersionInfo);
};

const injectSettingsItem = () => {
  if (document.getElementById('openasar-item')) return;

  const advanced = findAdvancedItem();
  if (!advanced) return;

  const oaSetting = advanced.cloneNode(true);
  const text = oaSetting.querySelector('[class*="text"]') ?? oaSetting;

  oaSetting.id = 'openasar-item';
  oaSetting.setAttribute('aria-label', 'OpenAsar');
  oaSetting.setAttribute('data-openasar', 'true');
  if (oaSetting.hasAttribute('data-list-item-id')) oaSetting.setAttribute('data-list-item-id', 'settings-sidebar___openasar_sidebar_item');
  if (oaSetting.hasAttribute('data-tab-id')) oaSetting.setAttribute('data-tab-id', 'OpenAsar');

  text.textContent = 'OpenAsar';
  oaSetting.onclick = openOpenAsarSettings;

  advanced.insertAdjacentElement('afterend', oaSetting);
};

let settingsObserver;
let settingsObserverTarget;
const attachSettingsObserver = () => {
  const sidebar = findSettingsSidebar();
  const nextTarget = sidebar?.closest('[class*="sidebar"]') ?? sidebar?.parentElement ?? sidebar;
  if (!nextTarget || nextTarget === settingsObserverTarget) return;

  settingsObserver?.disconnect();
  settingsObserverTarget = nextTarget;
  settingsObserver = new MutationObserver(() => {
    injectVersionInfo();
    injectSettingsItem();
    attachSettingsObserver();
  });
  settingsObserver.observe(nextTarget, { childList: true, subtree: true });
};

const syncSettingsInjection = () => {
  injectVersionInfo();
  injectSettingsItem();
  attachSettingsObserver();
};

setInterval(syncSettingsInjection, 1500);
syncSettingsInjection();

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
