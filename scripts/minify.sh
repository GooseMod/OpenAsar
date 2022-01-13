#!/bin/sh
rm -rf miniSrc
mkdir miniSrc

npx esbuild ./src --bundle --platform=node --external:electron --external:original-fs --external:auto-updater --outfile=miniSrc/index.js
npx esbuild ./src/splash/preload.js --bundle --platform=node --external:electron --external:original-fs --external:auto-updater --outfile=miniSrc/preload.js

npx uglifyjs --compress --mangle --toplevel -o miniSrc/index.js -- miniSrc/index.js
npx uglifyjs --compress --mangle --toplevel -o miniSrc/preload.js -- miniSrc/preload.js
npx uglifyjs --compress --mangle --toplevel -o miniSrc/mainWindowInject.js -- src/mainWindowInject.js

npx html-minifier --collapse-whitespace --remove-comments --remove-script-type-attributes --remove-tag-whitespace --minify-css true --minify-js true -o miniSrc/index.html -- src/splash/index.html
# cp src/splash/index.html miniSrc/

cp src/package.json miniSrc/package.json
npx minify-json miniSrc/package.json

npx asar pack miniSrc minified.asar
rm -rf miniSrc