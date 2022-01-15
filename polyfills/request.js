const https = require('https');
const querystring = require("querystring");

// Generic polyfill for "request" npm package, wrapper for https
const nodeReq = ({ method, url, headers, qs, timeout, body, stream }) => new Promise((resolve, reject) => {
  const fullUrl = `${url}${qs != null ? `?${querystring.stringify(qs)}` : ''}`; // With query string

  let req;
  try {
    req = https.request(fullUrl, { method, headers, timeout }, async (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) { // Redirect, recall function
        return resolve(await nodeReq({ url: res.headers.location, method, headers, timeout, body, stream }));
      }

      resolve(res);
    });
  } catch (e) {
    return resolve(e);
  }

  req.on('error', resolve);

  if (body) req.write(body); // Write POST body if included

  req.end();
});

const request = (...args) => {
  // We have to use ...args because we have to support all of these possible args:
  // request(url, callback)
  // request(options, callback)
  // request(url, options, callback)

  let options, callback;
  switch (args.length) {
    case 3: // request(url, options, callback)
      options = {
        url: args[0],
        ...args[1]
      };

      callback = args[2];
      break;

    default: // request(url, callback) / request(options, callback)
      options = args[0];
      callback = args[1];
  }

  if (typeof options === 'string') {
    options = {
      url: options
    };
  }

  console.log('[OpenAsar Request Polyfill]', options.url);

  const listeners = {};

  nodeReq(options).then(async (res) => {
    const isError = !res.statusCode;

    if (isError) {
      console.log('[OpenAsar Request Polyfill] Error:', res);
      listeners['error']?.(res);
      callback?.(res, null, null);

      return;
    }

    listeners['response']?.(res);

    let body = '';

    res.on('data', (chunk) => {
      body += chunk;
      listeners['data']?.(chunk);
    });

    await new Promise((resolve) => res.on('end', resolve)); // Wait to read full body

    callback?.(undefined, res, body);
  });

  const ret = {
    on: (type, handler) => {
      listeners[type] = handler;
      return ret; // Return self
    }
  };

  return ret;
};

for (const m of [ 'get', 'post', 'put', 'patch', 'delete', 'head', 'options' ]) {
  request[m] = (url, callback) => request({ url, method: m.toUpperCase() }, callback);
}
request.del = request.delete; // Special case

module.exports = request;