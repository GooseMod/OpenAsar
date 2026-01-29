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
  console.log("[OpenASAR] L30: Début de setInterval");
  const versionInfo = document.querySelector('[class*="sidebar"] [class*="compactInfo"]');
  if (!versionInfo || document.getElementById('openasar-ver')) return;

  console.log("[OpenASAR] L34: versionInfo existe");

  const oaVersionInfo = versionInfo.cloneNode(true);
  const oaVersion = oaVersionInfo.children[0];
  oaVersion.id = 'openasar-ver';
  oaVersion.textContent = 'OpenAsar (<hash>)';
  oaVersion.onclick = () => DiscordNative.ipc.send('DISCORD_UPDATED_QUOTES', 'o');

  oaVersionInfo.textContent = '';
  oaVersionInfo.appendChild(oaVersion);
  versionInfo.parentElement.parentElement.lastElementChild.insertAdjacentElement('beforebegin', oaVersionInfo);

  console.log("[OpenASAR] L46: Injection versionInfo terminée");

  if (document.getElementById('openasar-item')) return;

  console.log("[OpenASAR] L50: openasar-item n'existe pas");

  let advanced = document.querySelector('[data-list-item-id="settings-sidebar___advanced_sidebar_item"]');
  if (!advanced) advanced = document.querySelector('[class*="sidebar"] [class*="nav"] > [class*="section"]:nth-child(3) > :last-child');
  if (!advanced) advanced = [...document.querySelectorAll('[class*="item"]')].find(x => x.textContent === 'Advanced');

  console.log("[OpenASAR] L56: advanced= ${advanced}");

  const oaSetting = advanced.cloneNode(true);
  oaSetting.querySelector('[class*="text"]').textContent = 'OpenAsar';
  oaSetting.id = 'openasar-item';
  oaSetting.onclick = oaVersion.onclick;

  advanced.insertAdjacentElement('afterend', oaSetting);

  console.log("[OpenASAR] L65: Injection itemSetting terminée");

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
