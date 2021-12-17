const update = async () => {
  const getVar = (name, el = document.body) => el && (getComputedStyle(el).getPropertyValue(name) || getVar(name, el.parentElement)).trim();
  const vars = [ '--background-primary', '--background-secondary', '--brand-experiment', '--header-primary', '--text-muted' ];

  let cached = await DiscordNative.userDataCache.getCached() || {};

  const value = `.theme-dark { ${vars.reduce((acc, x) => acc += `${x}: ${getVar(x)}; `, '')} }`;

  cached['openasarSplashCSS'] = value;

  DiscordNative.userDataCache.cacheUserData(JSON.stringify(cached));
};
setInterval(update, 5000);

const settingsInject = async () => {
  const infoEl = document.querySelector('.info-1VyQPT');
  if (!infoEl || document.getElementById('openasar-version')) return;

  const el = document.createElement('el');
  el.id = 'openasar-version';
  el.className = 'colorMuted-HdFt4q size12-3cLvbJ line-3ColD0 versionHash-2gXjIB';
  el.textContent = 'OpenAsar <version_1> (<version_2>)';

  infoEl.appendChild(el);
};
setInterval(settingsInject, 1000);