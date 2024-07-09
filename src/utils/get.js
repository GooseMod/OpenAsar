const { net } = require('electron');

// returns a promise that resolves to [statusCode, Buffer, headers]
// [code, null, null] if request failed
module.exports = async (url) => {
  const request = new Request(url, {
    method: 'GET',
    redirect: 'follow'
  });
  const response = await net.fetch(request);

  if (response.ok) {
    return [response.status, Buffer.from(await response.arrayBuffer()), response.headers];
  } else {
    return [response.status, null, null];
  }
};