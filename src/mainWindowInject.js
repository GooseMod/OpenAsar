let lastBgPrimary = '';
const themesync = async () => {
  const getVar = (name, el = document.body) => el && (getComputedStyle(el).getPropertyValue(name) || getVar(name, el.parentElement))?.trim();

  const bgPrimary = getVar('--background-primary');
  if (!bgPrimary || bgPrimary === '#36393f' || bgPrimary === lastBgPrimary) return; // Default primary bg or same as last
  lastBgPrimary = bgPrimary;

  const vars = [ '--background-primary', '--background-secondary', '--brand-experiment', '--header-primary', '--text-muted' ];

  let cached = await DiscordNative.userDataCache.getCached() || {};

  const value = `body { ${vars.reduce((acc, x) => acc += `${x}: ${getVar(x)}; `, '')} }`;
  const pastValue = cached['openasarSplashCSS'];
  cached['openasarSplashCSS'] = value;

  if (value !== pastValue) DiscordNative.userDataCache.cacheUserData(JSON.stringify(cached));
};

setInterval(() => {
  try {
    themesync();
  } catch (e) { }
}, 10000);
themesync();

setInterval(() => {
  const host = [...document.querySelectorAll('[class^="socialLinks-"] + [class^="info-"] [class^="colorMuted-"]')].find(x => x.textContent.startsWith('Host '));
  if (!host || document.querySelector('#openasar-ver')) return;

  const el = document.createElement('span');
  el.id = 'openasar-ver';

  el.textContent = 'OpenAsar <hash>';
  el.onclick = () => DiscordNative.ipc.send('DISCORD_UPDATED_QUOTES', 'o');

  host.append(document.createTextNode(' | '), el);
}, 2000);


const el = document.createElement('style');
el.appendChild(document.createTextNode(`[class^="socialLinks-"] + [class^="info-"] {
  padding-right: 0;
}

#openasar-ver {
  text-transform: none;
  cursor: pointer;
}

#openasar-ver:hover {
  text-decoration: underline;
  color: var(--text-normal);
}`));
document.body.appendChild(el);

openasar = {};