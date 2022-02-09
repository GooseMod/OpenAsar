# OpenAsar
**An experimental open-source alternative of Discord desktop's `app.asar`**

## Features
- **:rocket: Startup Speed**: ~2x faster startup times (up to ~4x with experimental config)
- **:chart_with_upwards_trend: Performance**: OpenAsar can make your client feel snappier (scrolling, switching channels, etc)
- **:paintbrush: Splash Theming**: Easy theming for your splash which works with most themes for any client mod
- **:electric_plug: Drop-in**: Replace one file and it's installed, that's it (same with uninstall)
- **:gear: Configurable**: Adds many config options for Discord and OpenAsar enhancements (see config section)
- **:feather: Lightweight**: <1% of Discord's original size (9mb -> ~80kb)
- **:shield: No Tracking**: Removes Discord's built-in tracking for crashes and errors in the asar (not app itself)

### See [FAQ](faq.md) for more details

<br>

## [Install Guide](https://github.com/GooseMod/OpenAsar/wiki/Install-Guide)


## Config
You can configure OpenAsar via `settings.json` (found in your Discord app data / user data), under a `openasar` object. Keep in mind most options are defaults for good reason.

### OpenAsar Options
- `quickstart` (bool, default false) - whether to use Quickstart (experimental)
- `themeSync` (bool, default true) - syncs your modded client's theme with splash theming
- `autoupdate` (bool, default true) - whether to autoupdate OpenAsar after Discord startup
- `updatePrompt` (bool, default false) - whether to show update prompt after updating OpenAsar
- `splashText` (bool, default false) - whether to show bottom right version info text in splash

### Extra Discord Options
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

Additionally there are some environmental variables you can use:
- `OPENASAR_QUICKSTART` (bool, default false) - same as `quickstart` config option
- `OPENASAR_NOSTART` (bool, default false) - if enabled halts starting after splash loads (for splash testing)
