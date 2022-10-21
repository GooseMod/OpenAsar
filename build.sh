#!/bin/bash

# Builds the app.asar

# Prerequisites
npm install -g asar

# Clean up previous builds
rm app.asar

bash scripts/injectPolyfills.sh

# Set the version
sed -i -e "s/nightly/nightly-$(git rev-parse HEAD | cut -c 1-7)/" src/index.js
node scripts/strip.js

# Build the asar
npx asar pack src app.asar
