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
}, 5000);


const css = `
[class^="socialLinks-"] + [class^="info-"] [class^="colorMuted-"]:nth-last-child(2)::after {
  content: " | OpenAsar <oa_version_hash>";
  display: inline;
  text-transform: none;
}

[class^="socialLinks-"] + [class^="info-"] {
  padding-right: 0;
}

[class^="vertical-"] > div[style="display: flex; justify-content: space-between;"] > div > [class^="description-"] {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
`;

const el = document.createElement('style');
el.appendChild(document.createTextNode(css));
document.body.appendChild(el);


window.openasar = {};