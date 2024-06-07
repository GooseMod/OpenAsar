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
  const host = [...document.querySelectorAll('[class*="sidebar"] [class*="info"] [class*="line"]')].find(x => x.textContent.startsWith('Host '));
  if (!host || document.getElementById('openasar-ver')) return;

  const oaVersion = host.cloneNode(true);
  oaVersion.id = 'openasar-ver';
  oaVersion.textContent = 'OpenAsar <channel> ';
  oaVersion.onclick = () => DiscordNative.ipc.send('DISCORD_UPDATED_QUOTES', 'o');

  const oaHash = document.querySelector('[class*="versionHash"]').cloneNode(true);
  oaHash.textContent = '(<hash>)';
  oaVersion.appendChild(oaHash);

  host.insertAdjacentElement('afterend', oaVersion);

  let advanced = document.querySelector('[class*="socialLinks"]').parentElement.querySelector('[class*="premiumTab"] ~ [class*="header"] + [class*="item"] + [class*="item"] + [class*="item"] + [class*="item"] + [class*="item"] + [class*="item"] + [class*="item"] + [class*="item"] + [class*="item"] ~ [class*="separator"]')?.previousSibling;
  if (!advanced) advanced = [...document.querySelectorAll('[class*="item"]')].find(x => x.textContent === 'Advanced');
  if (!advanced || document.getElementById('openasar-item')) return;

  const oaSetting = advanced.cloneNode(true);
  oaSetting.textContent = 'OpenAsar';
  oaSetting.id = 'openasar-item';
  oaSetting.onclick = oaVersion.onclick;

  advanced.insertAdjacentElement('afterend', oaSetting);
}, 1000);

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
