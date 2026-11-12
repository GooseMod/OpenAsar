const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

function initializePaths(buildInfo) {
  const filename = path.join(__dirname, '../src/paths.js');
  const module = { exports: {} };
  const directories = [];
  const root = path.join(path.parse(process.cwd()).root, 'Discord');
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), {
    module,
    exports: module.exports,
    global: {},
    process: { platform: 'win32', resourcesPath: path.join(root, 'resources'), env: {} },
    require(name) {
      if (name === 'fs') return { mkdirSync(directory) { directories.push(directory); } };
      if (name === './utils/buildInfo') return { releaseChannel: 'stable', version: '1.0.9268', ...buildInfo };
      if (name === 'electron') return {
        app: {
          getPath(name) { return name === 'exe' ? path.join(root, 'app-1.0.9268', 'Discord.exe') : root; },
          setPath() {}
        }
      };
      return require(name);
    }
  }, { filename });
  module.exports.init();
  return { paths: module.exports, root, directories };
}

test('creates the versioned data and log directories on a fresh install', () => {
  const { root, directories } = initializePaths({});
  assert.deepEqual(directories, [path.join(root, 'discord', '1.0.9268'), path.join(root, 'discord', 'logs')]);
});

test('uses persistent module data for current Discord builds without newUpdater metadata', () => {
  const { paths, root } = initializePaths({});
  assert.equal(paths.getModuleDataPath(), path.join(root, 'discord', 'module_data'));
});

test('preserves explicitly selected legacy module data', () => {
  const { paths, root } = initializePaths({ newUpdater: false });
  assert.equal(paths.getModuleDataPath(), path.join(root, 'discord', '1.0.9268', 'modules'));
});

test('uses standalone module data when requested by the host build', () => {
  const { paths, root } = initializePaths({ standaloneModules: true });
  assert.equal(paths.getModuleDataPath(), path.join(root, 'resources', 'standalone_modules'));
});

test('preserves the local module data override', () => {
  const override = path.join(path.parse(process.cwd()).root, 'custom-modules');
  const { paths } = initializePaths({ localModulesRoot: override, standaloneModules: true });
  assert.equal(paths.getModuleDataPath(), override);
});
