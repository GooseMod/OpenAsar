const update = async () => {
  const getVar = (name, el = document.body) => el && (getComputedStyle(el).getPropertyValue(name) || getVar(name, el.parentElement)).trim();
  const vars = [ '--background-primary', '--background-secondary', '--brand-experiment', '--header-primary', '--text-muted' ];

  let cached = await DiscordNative.userDataCache.getCached() || {};

  const value = `body { ${vars.reduce((acc, x) => acc += `${x}: ${getVar(x)}; `, '')} }`;
  const pastValue = cached['openasarSplashCSS'];
  cached['openasarSplashCSS'] = value;

  if (value !== pastValue) DiscordNative.userDataCache.cacheUserData(JSON.stringify(cached));
};
setInterval(update, 3000);

const css = `
.socialLinks-3jqNFy + .info-1VyQPT .colorMuted-HdFt4q:nth-last-child(2)::after {
  content: " | OpenAsar <version_2>";
  display: inline;
  text-transform: none;
}

.socialLinks-3jqNFy + .info-1VyQPT {
  padding-right: 0;
}
`;

const el = document.createElement('style');
el.appendChild(document.createTextNode(css));
document.body.appendChild(el);