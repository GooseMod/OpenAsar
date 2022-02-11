const request = require('request');

const nodeRequest = ({ method, url, headers, qs, timeout, body, stream }) => new Promise((resolve, reject) => {
  const req = request({ method, url, headers, qs, timeout: timeout ?? 30000, body });

  req.on('response', (response) => {
    const total = parseInt(response.headers['content-length'] || 1, 10);
    let outOf = 0;
    const chunks = [];

    const badStatus = response.statusCode >= 300;    
    if (badStatus) stream = null;
    
    response.on('data', chunk => {
      chunks.push(chunk);

      if (!stream) return;
      outOf += chunk.length;
      stream.write(chunk);
      stream.emit('progress', [ outOf, total ]);
    });

    response.on('end', () => {
      if (stream != null) {
        stream.on('finish', () => resolve(response));
        return stream.end();
      }
    
      if (badStatus) return reject(new Error('Req error:' + response.statusCode));
    
      resolve({ ...response, body: Buffer.concat(chunks) });
    });
  });

  req.on('error', err => reject(err));
});

const meth = (method, opt) => nodeRequest({ ...(typeof opt === 'string' ? { url: opt } : opt), method });
exports.get = meth.bind(null, 'GET');