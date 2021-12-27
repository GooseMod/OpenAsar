# OpenAsar
**An experimental open-source alternative of Discord desktop's `app.asar`**

## Features
- **:rocket: Startup Speed**: ~2x faster startup times (up to ~4x with experimental config)
- **:chart_with_upwards_trend: Performance**: OpenAsar can make your client feel snappier (scrolling, switching channels, etc)
- **:paintbrush: Splash Theming**: Easy theming for your splash which works with most themes for any client mod
- **:electric_plug: Hotpluggable**: Replace one file and it's installed, that's it (same with uninstall)
- **:gear: Configurable**: Adds many config options for Discord and OpenAsar enhancements (see config section)
- **:feather: Lightweight**: <2% of Discord's original size (9mb -> ~150kb)
- **:shield: No Tracking**: Removes Discord's built-in tracking for crashes and errors (asar-side only)

### See [FAQ](faq.md) for more details

<br>

## Install Guide
1. [Download latest nightly release](https://github.com/GooseMod/OpenAsar/releases/download/nightly/app.asar)
2. Find your `app.asar`, it should be `<where the Discord exe is>/resources/app.asar`. For Windows this is like: `%localappdata%\Discord\app-1.0.9003\resources\app.asar` (your app folder may have a different version)
3. Backup your original `app.asar` (rename to `app.asar.backup` / etc)
4. Install OpenAsar `app.asar` into the original path (you may need to be root on Linux)
5. Restart Discord via system tray (you should notice Discord start faster as a way to see if it's instantly working)

<!-- **If using Linux it is highly recommended to disable write protection** (needing root to overwrite files) for your Discord install if you have it enabled. It is not much of a security defecit as Windows has no write protection as well. This enables updating the asar and potentially host updating further on. -->

## Config
You can configure OpenAsar via `settings.json` (found in your Discord app data / user data), under a `openasar` object. Keep in mind most options are defaults for good reason.

### OpenAsar Options
- `quickstart` (bool, default false) - whether to use Quickstart (experimental)
- `themeSync` (bool, default true) - syncs your modded client's theme with splash theming
- `autoupdate` (bool, default true) - whether to autoupdate OpenAsar after Discord startup
- `updatePrompt` (bool, default false) - whether to show update prompt after updating OpenAsar
- `splashText` (bool, default true) - whether to show bottom right version info text in splash
- `ssoeAllowlist` (bool, default true) - whether to use safer custom method of opening external urls (true) or normal Discord's method (false)

### Extra Discord Options
- `multiInstance` (bool, default false) - whether to enable multi-instance
- `skipStartupUpdateChecks` (bool, default false) - skips startup update checking (Linux-only)

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