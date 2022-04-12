const { get } = require('https');
const zlib = require('zlib');
const fs = require('fs');

console.log('getting manifest...');

get('https://discord.com/api/updates/distributions/app/manifests/latest?channel=canary&platform=win&arch=x86', async (res) => {
  let body = '';
  res.on('data', (chunk) => {
    body += chunk.toString();
  });

  await new Promise((resolve) => res.on('end', resolve)); // Wait to read full body

  const manifest = JSON.parse(body);
  const downloadUrl = manifest.full.url;

  console.log('downloading full.distro...');

  get(downloadUrl, async (res) => {
    let body = [];
    res.on('data', (chunk) => {
      body.push(chunk);
    });

    await new Promise((resolve) => res.on('end', resolve)); // Wait to read full body

    console.log('decompressing...');

    body = Buffer.concat(body);
    body = zlib.brotliDecompressSync(body);

    fs.writeFileSync('client.tar', body);
  });
});