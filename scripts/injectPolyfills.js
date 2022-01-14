const { readdirSync, copyFileSync, mkdirSync } = require('fs');
const { join } = require('path');

const rootDir = join(__dirname, '..');
const nodeModules = join(rootDir, 'src', 'node_modules');
mkdirSync(nodeModules, { recursive: true }); // Ensure node_modules exists

const polyfillsDir = join(rootDir, 'polyfills');
for (const file of readdirSync(polyfillsDir)) {
  const [ name ] = file.split('.');
  const jsPath = join(polyfillsDir, file);

  copyFileSync(jsPath, join(nodeModules, name + '.js'));
}