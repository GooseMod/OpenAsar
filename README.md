# OpenAsar
**An experimental open-source alternative of Discord desktop's `app.asar`**.

## Features
- **:rocket: Speed**: ~2x faster startup times (up to ~4x with experimental config)
- **:feather: Lightweight**: <2% of Discord's original size (9mb -> ~150kb)
- **:gear: Configurable**: Adds many config options for Discord and OpenAsar enhancements (see config section)
- **:electric_plug: Hotpluggable**: Replace one file and it's installed, that's it
- **:shield: No Tracking**: Removes Discord's built-in tracking for crashes and errors
- **:sewing_needle: Patching**: A future platform for custom patches to further enhance


<br>

## Install Guide
**OpenAsar is heavily disrecommened due to it being in early development.**
1. [Download latest nightly release](https://github.com/GooseMod/OpenAsar/releases/download/nightly/app.asar)
4. Backup your original `app.asar` (rename to `app.asar.backup` / etc)
5. Install OpenAsar `app.asar` into the original path

**If using Linux it is highly recommended to disable write protection** (needing root to overwrite files) for your Discord install if you have it enabled. It is not much of a security defecit as Windows has no write protection as well. This enables updating the asar and potentially host updating further on.

## Config
You can configure OpenAsar via `settings.json` (found in your Discord app data / user data), under a `openasar` object. Keep in mind most options are defaults for good reason. The avaliable options are:
- `quickstart` (bool, default false) - whether to use Quickstart (experimental)
- `skipStartupUpdateChecks` (bool, default false) - skips startup update checking (Linux-only)
- `autoupdate` (bool, default true) - whether to autoupdate OpenAsar after Discord startup
- `multiInstance` (bool, default false) - whether to enable multi-instance
- `ssoeAllowlist` (bool, default true) - whether to use safer custom method of opening external urls (true) or normal Discord's method (false)

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

Additionally there are some environmental variables you can use:
- `OPENASAR_QUICKSTART` (bool, default false) - same as `quickstart` config option
- `OPENASAR_NOSTART` (bool, default false) - if enabled halts starting after splash loads (for splash testing)