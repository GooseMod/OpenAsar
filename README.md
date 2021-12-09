# OpenAsar
**Open-source alternative of Discord desktop's `app.asar`**

## Goals
- **Hotpluggable** - just swap the asar file, nothing else needed
- **Lightweight** - it should be at least as fast or lightweight, hopefully more
- **No Tracking** - no crash reporting, error tracking, etc
- **Minimal** - generally only doing what is needed (see: implementation)
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

## Custom Patches
Custom patches are another main goal of OpenAsar, patching enhancements where otherwise impossible to do so with traditional mods. Our current ideas for patches to do:
- [ ] Skipping checking for updates on startup
- [ ] Linux host app updating


## Install Guide
**OpenAsar is heavily disrecommened due to it being in early development.**
1. Clone repo
2. NPM install in `src` dir (`cd src; npm i`)
3. Pack into `app.asar` via `asar` NPM package - `asar pack src app.asar`
4. Backup your original `app.asar` (rename to `app.asar.backup` / etc)
5. Install OpenAsar `app.asar` into the original path