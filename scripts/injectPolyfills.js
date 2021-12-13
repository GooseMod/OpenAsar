const { readdirSync, mkdirSync, copyFileSync } = require('fs');
const { join } = require('path');

const rootDir = join(__dirname, '..');

const polyfillsDir = join(rootDir, 'polyfills');
for (const file of readdirSync(polyfillsDir)) {
  const [ name ] = file.split('.');
  const jsPath = join(polyfillsDir, file);

  const moduleDir = join(rootDir, 'src', 'node_modules', name);

  try {
    mkdirSync(moduleDir);
  } catch (e) {}

  copyFileSync(jsPath, join(moduleDir, 'index.js'));
}