const https = require('https');
const querystring = require("querystring");

// Generic polyfill for "request" npm package, wrapper for https
const nodeReq = ({ method, url, headers, qs, timeout, body, stream }) => {
  return new Promise((resolve, reject) => {
    const fullUrl = `${url}${qs != null ? `?${querystring.stringify(qs)}` : ''}`; // With query string

    let req;
    try {
      req = https.request(fullUrl, {
        method,
        headers,
        timeout
      }, async (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) { // Redirect, recall function
          return resolve(await nodeReq({
            url: res.headers.location,
            qs: null,
            method,
            headers,
            timeout,
            body,
            stream
          }));
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
};

const request = (...args) => { // Main function
  // We have to use ...args because fun fact! request supports both:
  // request(url, callback)
  // request(options, callback)
  // ^ These are fine as they have the same number of arguments, however it also supports:
  // request(url, options, callback)
  // ...I know, right

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

  // log('Polyfill > Request', options.method, options.url);

  const listeners = {};

  nodeReq(options).then(async (res) => { // No error handling because yes
    const isError = !res.statusCode;

    if (isError) {
      listeners['error']?.(res);
      callback?.(res, null, null); // Return null for others?

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

// Method functions
request.get = (url, callback) => request({ url: url, method: 'GET' }, callback);
request.post = (url, callback) => request({ url: url, method: 'POST' }, callback);
request.put = (url, callback) => request({ url: url, method: 'PUT' }, callback);
request.patch = (url, callback) => request({ url: url, method: 'PATCH' }, callback);
request.delete = (url, callback) => request({ url: url, method: 'DELETE' }, callback);
request.del = request.delete; // Random shortened func because request
request.head = (url, callback) => request({ url: url, method: 'HEAD' }, callback);
request.options = (url, callback) => request({ url: url, method: 'OPTIONS' }, callback);

module.exports = request;