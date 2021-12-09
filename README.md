# OpenAsar
**Open-source alternative of Discord desktop's `app.asar`** OpenAsar is currently made of **~80% own code**, with the rest being from Discord as it hasn't been rewritten yet or because of compatibility reasons.

## Goals
- **Hotpluggable** - just swap the asar file, nothing else needed
- **Lightweight** - it should be at least as fast or lightweight, hopefully more
- **No Tracking** - no crash reporting or error tracking (in normal Discord)
- **Minimal** - generally only doing what is needed
- **Patch Platform** - provide a platform for future patching

## Implementation
Below is a list in order of priority, marked as complete when finished:
- [X] Bootstrapping
- [X] Splash screen
- [X] Error handling
- [ ] A bunch of specific minor fixes / features
  - [ ] Handle hardware acceleration
- [ ] Auto start
- [ ] First run
- [ ] Self-write some small parts of internals
- [ ] Patch updater to survive host updates
- [ ] Self-write updater code (currently mostly copied)
- [ ] Compatibility / replication of original Discord splash?

## Config
You can configure OpenAsar via `settings.json` (found in your Discord app data / user data), under a `openasar` object. Keep in mind most options are defaults for good reason, they may temporarily brick your client until you revert your changes. The avaliable options are:
- `quickstart` (bool) - enables Quickstart (experimental)
- `skipStartupUpdateChecks` (bool) - skips startup update checking (Linux-only)

An example of a settings.json with OpenAsar config:
```json
{
  "BACKGROUND_COLOR": "#202225",
  "IS_MAXIMIZED": false,
  "IS_MINIMIZED": false,
  "WINDOW_BOUNDS": {
    "x": 801,
    "y": 22,
    "width": 797,
    "height": 876
  },
  "MINIMIZE_TO_TRAY": false,
  "OPEN_ON_STARTUP": false,
  "openasar": {
    "quickstart": true
  }
}
```


## Custom Patches
Custom patches are another main goal of OpenAsar, patching enhancements where otherwise impossible to do so with traditional mods. Our current ideas for patches to do:
- [X] Skipping checking for updates on startup
- [ ] Linux host app updating


## Install Guide
**OpenAsar is heavily disrecommened due to it being in early development.**
1. Clone repo
2. NPM install in `src` dir (`cd src; npm i`)
3. Pack into `app.asar` via `asar` NPM package - `asar pack src app.asar`
4. Backup your original `app.asar` (rename to `app.asar.backup` / etc)
5. Install OpenAsar `app.asar` into the original path