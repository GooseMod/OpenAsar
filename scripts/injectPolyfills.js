const { readdirSync, copyFileSync } = require('fs');
const { join } = require('path');

const rootDir = join(__dirname, '..');

const polyfillsDir = join(rootDir, 'polyfills');
for (const file of readdirSync(polyfillsDir)) {
  const [ name ] = file.split('.');
  const jsPath = join(polyfillsDir, file);

  copyFileSync(jsPath, join(rootDir, 'src', 'node_modules', name + '.js'));
}