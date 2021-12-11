const { readdirSync, mkdirSync, copyFileSync } = require('fs');
const { join } = require('path');

const polyfillsDir = join(__dirname, 'polyfills');
for (const file of readdirSync(polyfillsDir)) {
  const [ name ] = file.split('.');
  const jsPath = join(polyfillsDir, file);

  const moduleDir = join(__dirname, 'src', 'node_modules', name);

  try {
    mkdirSync(moduleDir);
  } catch (e) {}

  copyFileSync(jsPath, join(moduleDir, 'index.js'));
}