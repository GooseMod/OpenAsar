const { get } = require('https');
const { session } = require('electron');

const bl = { cancel: true }; // Standard block callback response

let sentry;
session.defaultSession.webRequest.onBeforeRequest({
  urls: [
    'https://*.discord.com/assets/*.js',
    'https://*/api/*/science'
  ]
}, async ({ url }, cb) => {
  if (url.endsWith('/science')) return cb(bl);

  if (!sentry) {
    if ((await new Promise((res) => get(url, (r) => { // Get content (js code) from URL
      let t = '';

      r.on('data', c => t += c.toString());
      r.on('end', () => res(t));
    }))).includes('RecipeWebview')) sentry = url;
  }

  if (sentry === url) return cb(bl);

  cb({});
});