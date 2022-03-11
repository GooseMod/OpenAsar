const https = require('https');

// Generic polyfill for "request" npm package, wrapper for https
const nodeReq = ({ method, url, headers, qs, timeout, body, stream }) => new Promise((resolve) => {
  const fullUrl = `${url}${qs != null ? `?${(new URLSearchParams(qs)).toString()}` : ''}`; // With query string

  let req;
  try {
    req = https.request(fullUrl, { method, headers, timeout }, async (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) return resolve(await nodeReq({ url: res.headers.location, method, headers, timeout, body, stream }));

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

  const listeners = {};

  nodeReq(options).then(async (res) => {
    if (!res.statusCode) {
      listeners['error']?.(res);
      callback?.(res, null, null);

      return;
    }

    listeners['response']?.(res);

    let data = [];
    res.on('data', (chunk) => {
      data.push(chunk);
      listeners['data']?.(chunk);
    });

    await new Promise((resolve) => res.on('end', resolve)); // Wait to read full body

    const buf = Buffer.concat(data);
    callback?.(undefined, res, options.encoding !== null ? buf.toString() : buf);
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
  request[m] = (url, callback) => request({ url, method: m }, callback);
}
request.del = request.delete; // Special case

module.exports = request;