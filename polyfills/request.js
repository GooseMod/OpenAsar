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

const request = (options, callback) => { // Main function
  if (typeof options === 'string') {
    options = {
      url: options
    };
  }

  // log('Polyfill > Request', options.method, options.url);

  const listeners = {};

  nodeReq(options).then(async (res) => { // No error handling because yes
    const isError = !res.agent;

    if (isError) {
      if (listeners['error']) listeners['error'](res);
      if (callback) callback(res, null, null); // Return null for others?

      return;
    }

    if (listeners['response']) listeners['response'](res);
    if (!callback) return;

    let body = '';
    res.setEncoding('utf8');

    res.on('data', (chunk) => body += chunk);

    await new Promise((resolve) => res.on('end', resolve)); // Wait to read full body

    callback(undefined, res, body);
  });

  return {
    on: (type, handler) => {
      listeners[type] = handler;
    }
  }
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