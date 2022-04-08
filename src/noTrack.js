const { get } = require('https');
const { session } = require('electron');

let sentry;
session.defaultSession.webRequest.onBeforeRequest({
  urls: [
    'https://*.discord.com/assets/*.js',
    'https://*/api/*/science'
  ]
}, async ({ url }, cb) => {
  if (url.endsWith('/science')) return cb({ cancel: true });

  if (!sentry) {
    const content = await new Promise((res) => get(url, (r) => {
      let t = '';

      r.on('data', c => t += c.toString());
      r.on('end', () => res(t));
    }));

    if (content.includes('RecipeWebview')) sentry = url;
  }

  if (sentry === url) {
    log('NoTrack', 'Blocked', url);
    return cb({ cancel: true });
  }

  cb({});
});