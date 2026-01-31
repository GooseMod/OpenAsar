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
  if (document.getElementById('openasar-ver') && document.getElementById('openasar-item')) return;

  const sidebar = document.querySelector('[data-list-id="settings-sidebar"]');
  if (!sidebar) return;

  // Inject version info inside clickable div
  if (!document.getElementById('openasar-ver')) {
    const links = sidebar.querySelector('div[class*="links"]');
    
    if (links && links.parentElement) {
      const container = links.parentElement;
      const clickableDiv = container.firstElementChild;
      
      if (clickableDiv) {
        const oaVersion = document.createElement('div');
        oaVersion.id = 'openasar-ver';
        oaVersion.className = 'text-xxs/normal_cf4812';
        oaVersion.textContent = 'OpenAsar (<hash>)';
        oaVersion.onclick = () => window.open('https://openasar.dev', '_blank');
        oaVersion.style.color = 'var(--text-muted)';
        
        clickableDiv.appendChild(oaVersion);
        console.log('[OpenAsar] Version info injected');
      }
    }
  }

  // Inject menu item after Advanced
  if (!document.getElementById('openasar-item')) {
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
  }
};

const observer = new MutationObserver(() => injectOpenAsar());
observer.observe(document.body, { childList: true, subtree: true });
setTimeout(injectOpenAsar, 500);

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
