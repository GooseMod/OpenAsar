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
  const versionInfo = document.querySelector('[class*="sidebar"] [class*="compactInfo"]');
  if (!versionInfo || document.getElementById('openasar-ver')) return;

  const oaVersionInfo = versionInfo.cloneNode(true);
  const oaVersion = oaVersionInfo.children[0];
  oaVersion.id = 'openasar-ver';
  oaVersion.textContent = 'OpenAsar <channel> (<hash>)';
  oaVersion.onclick = () => DiscordNative.ipc.send('DISCORD_UPDATED_QUOTES', 'o');

  oaVersionInfo.textContent = '';
  oaVersionInfo.appendChild(oaVersion);
  versionInfo.parentElement.parentElement.lastElementChild.insertAdjacentElement('beforebegin', oaVersionInfo);

  if (document.getElementById('openasar-item')) return;
  let advanced = document.querySelector('[data-list-item-id="settings-sidebar___advanced_sidebar_item"]');
  if (!advanced) advanced = document.querySelector('[class*="sidebar"] [class*="nav"] > [class*="section"]:nth-child(3) > :last-child');
  if (!advanced) advanced = [...document.querySelectorAll('[class*="item"]')].find(x => x.textContent === 'Advanced');

  const oaSetting = advanced.cloneNode(true);
  oaSetting.querySelector('[class*="text"]').textContent = 'OpenAsar';
  oaSetting.id = 'openasar-item';
  oaSetting.onclick = oaVersion.onclick;

  oaSetting.querySelector('svg').innerHTML = '<path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M4.911 6.762c-.89.37-2.092.522-3.516-.184-.412-.202-.334-.832.108-.94.665-.161 1.482-.397 2.158-.697q.064-.277.173-.616c.784-2.463 3.891-2.463 4.91-.909.271.42.442.893.535 1.367.225 1.088.078 2.23-.365 3.255-.691 1.608-.893 3.162-.598 4.21a.35.35 0 0 0 .528.194c1.173-.776 5.073-2.827 8.972 1.072 0 0 1.468 1.655 4.218 1.523.528-.023.862.428.84.955-.275 6.534-11.023 6.2-14.38 5.29-2.951-.799-4.73-2.757-4.668-6.766.023-1.367.575-2.648 1.375-3.76h.008c1.432-1.987.283-3.444-.298-3.994m1.65-2.958a.777.777 0 1 0 0 1.554.777.777 0 0 0 0-1.554"></path>';

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
