# Building

## Windows

1. Install node.js from the [node.js website](https://nodejs.org/en/)

## Mac OS

# TODO: please do this

## Linux

1. Install nodejs

Debian/Ubuntu:

# TODO: please test this

```bash
sudo apt install nodejs npm
```

Archlinux:

```bash
sudo pacman -S nodejs npm
```

2. Clone this repository

```bash
git clone https://github.com/GooseMod/OpenAsar.git
cd OpenAsar
```

3. Run the commands to build the app.asar file

```bash
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
```
