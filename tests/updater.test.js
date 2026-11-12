const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

function loadUpdater(globalPaths) {
  const filename = path.join(__dirname, '../src/updater/updater.js');
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), {
    module,
    exports: module.exports,
    process,
    log() {},
    require(name) {
      if (name === 'electron') return { app: {} };
      if (name === 'module') return { globalPaths };
      if (name === '../paths') return {};
      return require(name);
    }
  }, { filename });
  return module.exports.Updater;
}

test('registers native module paths already added during startup', () => {
  const root = path.join(path.parse(process.cwd()).root, 'Discord');
  const searchPath = path.join(root, 'app-1.0.9268', 'modules', 'discord_voice-1');
  const globalPaths = [searchPath];
  const Updater = loadUpdater(globalPaths);
  const updater = new Updater({
    root_path: root,
    nativeUpdaterModule: { Updater: class {} }
  });
  updater.committedHostVersion = [1, 0, 9268];
  updater._commitModulesInner({ current_modules: { discord_voice: 1 } });

  assert.equal(updater.committedModulePaths.get('discord_voice'), path.join(searchPath, 'discord_voice'));
  assert.equal(updater.committedModules.has('discord_voice'), true);
  assert.deepEqual(globalPaths, [searchPath]);
});

test('adds newly installed modules without duplicating or switching committed versions', () => {
  const root = path.join(path.parse(process.cwd()).root, 'Discord');
  const globalPaths = [];
  const Updater = loadUpdater(globalPaths);
  const updater = new Updater({
    root_path: root,
    nativeUpdaterModule: { Updater: class {} }
  });
  updater.committedHostVersion = [1, 0, 9268];
  updater._commitModulesInner({ current_modules: { discord_voice: 1 } });
  updater._commitModulesInner({ current_modules: { discord_voice: 2, discord_video: 3 } });

  const base = path.join(root, 'app-1.0.9268', 'modules');
  assert.equal(updater.committedModulePaths.get('discord_voice'), path.join(base, 'discord_voice-1', 'discord_voice'));
  assert.equal(updater.committedModulePaths.get('discord_video'), path.join(base, 'discord_video-3', 'discord_video'));
  assert.deepEqual(globalPaths, [path.join(base, 'discord_video-3'), path.join(base, 'discord_voice-1')]);
});
