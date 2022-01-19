const request = require('request');

const nodeRequest = ({ method, url, headers, qs, timeout, body, stream }) => new Promise((resolve, reject) => {
  const req = request({
    method,
    url,
    qs,
    headers,
    followAllRedirects: true,
    encoding: null,
    timeout: timeout ?? 30000,
    body
  });

  req.on('response', (response) => {
    const totalBytes = parseInt(response.headers['content-length'] || 1, 10);
    let receivedBytes = 0;
    const chunks = [];

    const badStatus = response.statusCode >= 300;    
    if (badStatus) stream = null;
    
    response.on('data', chunk => {
      if (stream != null) {
        receivedBytes += chunk.length;
        stream.write(chunk);
        return stream.emit('progress', {
          totalBytes,
          receivedBytes
        });
      }
    
      chunks.push(chunk);
    });

    response.on('end', () => {
      if (stream != null) {
        stream.on('finish', () => resolve(response));
        return stream.end();
      }
    
      if (badStatus) {
        const err = new Error('HTTP Error: Status Code ' + response.statusCode);
        err.response = response;
        return reject(err);
      }
    
      resolve({
        ...response,
        body: Buffer.concat(chunks)
      });
    });
  });

  req.on('error', err => reject(err));
});

function requestWithMethod(method, options) {
  if (typeof options === 'string') {
    options = {
      url: options
    };
  }

  options = { ...options,
    method
  };

  log('Updater > Request', method, options.url);

  return nodeRequest(options);
}

exports.get = requestWithMethod.bind(null, 'GET');