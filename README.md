# OpenAsar
**An experimental open-source alternative of Discord desktop's `app.asar`**.

## Features
- **:rocket: Speed**: ~2x faster startup times (up to ~4x with experimental config)
- **:feather: Lightweight**: <2% of Discord's original size (9mb -> ~150kb)
- **:electric_plug: Hotpluggable**: Replace one file and it's installed, that's it
- **:shield: No Tracking**: Removes Discord's built-in tracking for crashes and errors
- **:sewing_needle: Patching**: A future platform for custom patches to further enhance


<br>

## To Be Implemented
Below is a list in order of priority, removed when completed:
- [ ] A bunch of specific minor fixes / features
  - [ ] Add Discord-specific Electron flags?
- [ ] Auto start
- [ ] First run
- [ ] Self-write some small parts of internals
- [ ] Self-write updater code (currently mostly copied)
- [ ] Compatibility / replication of original Discord splash?

## Custom Patches / Changes
Custom patches are another main goal of OpenAsar, patching enhancements where otherwise impossible to do so with traditional mods. Our current ideas for patches to do:
- [X] Rewrite portions of Discord's code to not rely on external dependencies, increasing speed and decreasing size
- [X] Skipping checking for updates on startup
- [ ] Linux host app updating


<br>

## Install Guide
**OpenAsar is heavily disrecommened due to it being in early development.**
1. [Download latest nightly release](https://github.com/GooseMod/OpenAsar/releases/download/nightly/app.asar)
4. Backup your original `app.asar` (rename to `app.asar.backup` / etc)
5. Install OpenAsar `app.asar` into the original path

**If using Linux it is highly recommended to disable write protection** (needing root to overwrite files) for your Discord install if you have it enabled. It is not much of a security defecit as Windows has no write protection as well. This enables updating the asar and potentially host updating further on.

## Config
You can configure OpenAsar via `settings.json` (found in your Discord app data / user data), under a `openasar` object. Keep in mind most options are defaults for good reason, they may temporarily brick your client until you revert your changes. The avaliable options are:
- `quickstart` (bool, default false) - whether to use Quickstart (experimental)
- `skipStartupUpdateChecks` (bool, default false) - skips startup update checking (Linux-only)
- `autoupdate` (bool, default true) - whether to autoupdate OpenAsar after Discord startup
- `multiInstance` (bool, default false) - whether to enable multi-instance

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
