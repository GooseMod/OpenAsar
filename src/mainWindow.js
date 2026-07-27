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
setInterval(() => {
  const openSettings = () => DiscordNative.ipc.send('DISCORD_UPDATED_QUOTES', 'o');

  const versionInfo =
    document.querySelector('.bd-version-info > div:nth-child(2)') ??
    document.querySelector('.bd-version-info') ??
    document.querySelector('[class*="sidebar"] [class*="compactInfo"]') ??
    [...document.querySelectorAll('[class*="sidebar"] [class*="info"] [class*="line"]')].find(x => x.textContent?.startsWith('Host '));

  if (versionInfo && !document.getElementById('openasar-ver')) {
    const oaVersionInfo = versionInfo.cloneNode(true);
    const oaVersion = oaVersionInfo.children?.[0] ?? oaVersionInfo;
    oaVersion.id = 'openasar-ver';
    oaVersion.textContent = 'OpenAsar <channel> (<hash>)';
    oaVersion.onclick = openSettings;

    if (oaVersionInfo !== oaVersion) {
      oaVersionInfo.textContent = '';
      oaVersionInfo.appendChild(oaVersion);
    }

    const versionTarget = versionInfo.parentElement?.parentElement?.lastElementChild;
    if (versionTarget) versionTarget.insertAdjacentElement('beforebegin', oaVersionInfo);
    else versionInfo.insertAdjacentElement('afterend', oaVersionInfo);
  }

  if (document.getElementById('openasar-item')) return;
  const sidebar = document.querySelector('[data-list-id="settings-sidebar"]') ?? document.querySelector('[class*="sidebar"] [class*="nav"]');
  const appSection = sidebar && (
    sidebar.querySelector('ul[aria-label="App Settings"]') ??
    [...sidebar.querySelectorAll('ul, [class*="section"]')].find(x => x.getAttribute?.('aria-label') === 'App Settings') ??
    [...sidebar.querySelectorAll('ul, [class*="section"]')].find(section => [...section.querySelectorAll('h1, h2, h3, [data-text-variant]')].some(x => x.textContent?.trim() === 'App Settings'))
  );
  let advanced = document.querySelector('[data-list-item-id="settings-sidebar___advanced_sidebar_item"]');
  if (appSection) {
    const appItems = [
      ...appSection.querySelectorAll('[role="listitem"]'),
      ...appSection.querySelectorAll('[data-list-item-id^="settings-sidebar___"]')
    ];

    advanced = appItems[appItems.length - 1] ?? advanced;
  }
  if (!advanced) advanced = document.querySelector('[class*="sidebar"] [class*="nav"] > [class*="section"]:nth-child(3) > :last-child');
  if (!advanced) advanced = [...document.querySelectorAll('[class*="item"]')].find(x => x.textContent === 'Advanced');
  if (!advanced) return;

  const oaSetting = advanced.cloneNode(true);
  oaSetting.querySelector('[class*="text"]').textContent = 'OpenAsar';
  oaSetting.id = 'openasar-item';
  oaSetting.onclick = openSettings;

  advanced.insertAdjacentElement('afterend', oaSetting);
}, 800);

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
