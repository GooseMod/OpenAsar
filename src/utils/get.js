const { net } = require('electron');

// returns a promise that resolves to [statusCode, Buffer, headers]
// [code, null, null] if request failed
module.exports.get = async url => {
  const response = await net.fetch(new Request(url, {
    method: 'GET',
    redirect: 'follow'
  }));

  if (response.ok) {
    return [response.status, Buffer.from(await response.arrayBuffer()), response.headers];
  } else {
    return [response.status, null, null];
  }
};

// issues a GET request following redirects, calling provided callbacks to return data and statues:
// - `response_cb` is called with a `IncomingMessage` (https://www.electronjs.org/docs/latest/api/incoming-message) on receiving an HTTP response
// - `data_cb` is called with a chunk for every data chunk arrived
// - `end_cb` is called when there are no more data
module.exports.request = (url, response_cb, data_cb, end_cb) => {
  const request = net.request({
    url: url,
    redirect: 'follow',
  });

  request.on('response', response => {
    response_cb(response);
    response.on('data', data_cb);
    response.on('end', end_cb)
  });

  request.end();
};