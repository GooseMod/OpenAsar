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
const injectOpenAsar = () => {
  if (document.getElementById('openasar-ver')) return true;

  const sidebar = document.querySelector('[data-list-id="settings-sidebar"]');
  if (!sidebar) return false;

  // Inject version info before links
  const links = sidebar.querySelector('div[class*="links"]');
  if (links) {
    const versionDiv = document.createElement('div');
    versionDiv.className = 'clickable__2debe compact__2debe';
    versionDiv.style.cssText = 'cursor: pointer; margin-bottom: 8px;';
    
    const versionSpan = document.createElement('span');
    versionSpan.id = 'openasar-ver';
    versionSpan.className = 'text-xxs/normal_cf4812';
    versionSpan.setAttribute('data-text-variant', 'text-xxs/normal');
    versionSpan.style.color = 'var(--text-muted)';
    versionSpan.textContent = 'OpenAsar (<hash>)';
    versionSpan.onclick = () => window.open('https://openasar.dev', '_blank');
    
    versionDiv.appendChild(versionSpan);
    links.parentElement.insertBefore(versionDiv, links);
    console.log('[OpenAsar] Version info injected');
  }

  if (document.getElementById('openasar-item')) return true;

  // Inject menu item after Advanced
  let advanced = sidebar.querySelector('[data-list-item-id*="advanced"]')
    || sidebar.querySelector('[data-settings-sidebar-item="advanced_panel"]')?.querySelector('[class*="item"]')
    || (() => {
      const sections = sidebar.querySelectorAll('[class*="section"]');
      return sections[2]?.querySelectorAll('[class*="item"]')[sections[2]?.querySelectorAll('[class*="item"]').length - 1];
    })();

  if (advanced) {
    const item = advanced.cloneNode(true);
    item.id = 'openasar-item';
    item.querySelector('[class*="text"]').textContent = 'OpenAsar';
    item.onclick = () => DiscordNative.ipc.send('DISCORD_UPDATED_QUOTES', 'o');
    advanced.insertAdjacentElement('afterend', item);
    console.log('[OpenAsar] Menu item injected');
  }

  return true;
};

const observer = new MutationObserver(() => {
  if (injectOpenAsar()) observer.disconnect();
});

observer.observe(document.body, { childList: true, subtree: true });
setTimeout(() => { if (injectOpenAsar()) observer.disconnect(); }, 500);

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
