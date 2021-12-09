# OpenAsar
**Open-source alternative of Discord desktop's `app.asar`**

## Goals
- **Hotpluggable** - just swap the asar file, nothing else needed
- **Lightweight** - it should be at least as fast or lightweight, hopefully more
- **No Tracking** - no crash reporting, error tracking, etc
- **Minimal** - generally only doing what is needed (see: implementation)

## Implementation
Below is a list in order of priority, marked as complete when finished:
- [X] Bootstrapping
- [X] Splash screen
- [X] Error handling
- [ ] A bunch of specific minor fixes / features
  - [ ] Handle hardware acceleration
- [ ] Auto start
- [ ] First run
- [ ] Self-write updater code (currently mostly copied)
- [ ] Self-write some small parts of internals

## Install Guide
**OpenAsar is heavily disrecommened due to it being in early development.**
1. Clone repo
2. NPM install in `src` dir (`cd src; npm i`)
3. Pack into `app.asar` via `asar` NPM package - `asar pack src app.asar`
4. Backup your original `app.asar` (rename to `app.asar.backup` / etc)
5. Install OpenAsar `app.asar` into the original path