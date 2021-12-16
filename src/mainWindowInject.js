const update = async () => {
  const getVar = (name, el = document.body) => el && (getComputedStyle(el).getPropertyValue(name) || getVar(name, el.parentElement)).trim();
  const vars = [ '--background-primary', '--background-secondary', '--brand-experiment', '--header-primary', '--text-muted' ];

  let cached = await DiscordNative.userDataCache.getCached() || {};

  const value = `.theme-dark {${vars.reduce((acc, x) => acc += `${x}: ${getVar(x)}; `, '')}}`;

  cached['openasarSplashCSS'] = value;

  DiscordNative.userDataCache.cacheUserData(JSON.stringify(cached));
};

setInterval(update, 5000);