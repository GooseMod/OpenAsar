let lastBgPrimary = '';
const themesync = async () => {
  const getVar = (name, el = document.body) => el && (getComputedStyle(el).getPropertyValue(name) || getVar(name, el.parentElement)).trim();

  const bgPrimary = getVar('--background-primary');
  if (bgPrimary === '#36393f' || bgPrimary === lastBgPrimary) return; // Default primary bg or same as last
  lastBgPrimary = bgPrimary;

  const vars = [ '--background-primary', '--background-secondary', '--brand-experiment', '--header-primary', '--text-muted' ];

  let cached = await DiscordNative.userDataCache.getCached() || {};

  const value = `body { ${vars.reduce((acc, x) => acc += `${x}: ${getVar(x)}; `, '')} }`;
  const pastValue = cached['openasarSplashCSS'];
  cached['openasarSplashCSS'] = value;

  if (value !== pastValue) DiscordNative.userDataCache.cacheUserData(JSON.stringify(cached));
};
setInterval(themesync, 3000);


const css = `
.socialLinks-3jqNFy + .info-1VyQPT .colorMuted-HdFt4q:nth-last-child(2)::after {
  content: " | OpenAsar <oa_version_hash>";
  display: inline;
  text-transform: none;
}

.socialLinks-3jqNFy + .info-1VyQPT {
  padding-right: 0;
}

.vertical-V37hAW > div[style="display: flex; justify-content: space-between;"] > div > .description-3_Ncsb {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
`;

const el = document.createElement('style');
el.appendChild(document.createTextNode(css));
document.body.appendChild(el);


const injectGMSettings = async () => {
  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

  while (!window.goosemod) {
    await sleep(100);
  }

  await sleep(1000); // Wait for init / etc

  goosemod.settings.items.unshift(
    ['item', 'OpenAsar', ['',
      {
        type: 'header',
        text: 'Info'
      },

      {
        type: 'text',
        text: 'Version',
        subtext: 'Channel: <oa_version_channel>\nHash: <oa_version_hash>'
      },

      {
        type: 'text',
        text: 'Cmd',
        subtext: 'Preset: <oa_cmd_preset>\nCmd: <oa_cmd_full>'
      }
    ], undefined, false],
    ['separator']
  )
};
injectGMSettings();