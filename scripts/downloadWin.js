const { get } = require('https');
const zlib = require('zlib');
const fs = require('fs');
const crypto = require('crypto');

console.log('getting manifest...');

const VALID_CHANNELS = ['stable', 'ptb', 'canary'];
const channel = VALID_CHANNELS.includes(process.argv[2]) ? process.argv[2] : 'stable';
const manifestUrl = 'https://discord.com/api/updates/distributions/app/manifests/latest?channel=' + channel + '&platform=win&arch=x64';

get(manifestUrl, async (res) => {
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

    console.log('verifying integrity...');

    body = Buffer.concat(body);
    const hash = crypto.createHash('sha256').update(body).digest('hex');
    if (manifest.full.hash && hash !== manifest.full.hash) {
      console.error('Integrity check failed: hash mismatch');
      process.exit(1);
    }

    console.log('decompressing...');

    body = zlib.brotliDecompressSync(body);

    fs.writeFileSync('client.tar', body);
  });
});