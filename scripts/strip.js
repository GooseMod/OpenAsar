const { execSync } = require('child_process');
const { readdirSync } = require('fs');
const { join } = require('path');

// Strip unneeded files in node deps
execSync(`rm -rf src/package-lock.json src/node_modules/.package-lock.json src/node_modules/**/package.json src/node_modules/**/*.md src/node_modules/**/.*.yml src/node_modules/**/.npmignore src/node_modules/**/LICENSE src/node_modules/**/test*`);

// Minify node deps code

for (const package of readdirSync('src/node_modules')) {
  const indexPath = join('src/node_modules', package, 'index.js');

  execSync(`npx uglifyjs --compress --mangle -o ${indexPath} -- ${indexPath}`);
}