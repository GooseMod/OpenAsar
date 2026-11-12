# OpenAsar &nbsp;<sup><sub>/ˈoʊpən ʌsɑr/ &nbsp;*(o-pen as-are)*</sup></sub>
![Nightly Status](https://github.com/GooseMod/OpenAsar/actions/workflows/nightly.yml/badge.svg) [![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)]([https://choosealicense.com/licenses/agpl/l](https://choosealicense.com/licenses/agpl-3.0/))

**An open-source alternative of Discord desktop's `app.asar`**

## Features
- **:rocket: Startup Speed**: ~2x faster startup times (up to ~4x with experimental config)
- **:chart_with_upwards_trend: Performance**: OpenAsar can make your client feel snappier (scrolling, switching channels, etc)
- **:paintbrush: Splash Theming**: Easy theming for your splash which works with most themes for any client mod
- **:electric_plug: Drop-in**: Replace one file and it's installed, that's it (same with uninstall)
- **:gear: Configurable**: Adds many config options for Discord and OpenAsar enhancements (see config section)
- **:cloud: Lightweight**: <1% of Discord's original size (9mb -> ~50kb)
- **:shield: No Tracking**: Removes Discord's built-in tracking for crashes and errors in the asar (not app itself)

### See [FAQ](faq.md) for more details

<br>

## [Install Guide](https://github.com/GooseMod/OpenAsar/wiki/Install-Guide)

### Build and install on Windows

OpenAsar replaces Discord's desktop bootstrap. Opening this source folder or running
a JavaScript file does not install it. Discord's main interface stays familiar;
the OpenAsar configuration entry appears in Discord's settings.

With Node.js 22.12 or newer installed, run these commands from this folder:

```powershell
npm ci
npm test
npm run build
```

Quit Discord completely, including its system tray icon, then install:

```powershell
npm run install:discord
```

The installer selects the latest Discord Stable installation and saves its original
`resources/app.asar` as `resources/app.asar.openasar-backup` before replacing it.
Reopen Discord after installation. For PTB or Canary, run
`npm run install:discord -- -Channel ptb` or
`npm run install:discord -- -Channel canary`. Use `-DiscordPath` to select a custom
installation directory.

To restore the saved file, quit Discord and run:

```powershell
npm run uninstall:discord
```

Discord host updates can replace `app.asar`; rerun the installer if OpenAsar
disappears after an update.

### Multiple Discord accounts on Windows

Open an additional Discord instance with its own login and settings:

```powershell
npm run discord:multi -- -ProfileName second
```

For another account, use `-ProfileName third`. Reuse a profile name to reopen
that account. Profiles are stored under `%APPDATA%\OpenAsar\profiles`, separately
from your normal Discord data. Run the launcher once per profile; close that
profile's existing window before starting it again. Add `-Channel ptb` or
`-Channel canary` to use those installations.


## Config
You can configure OpenAsar by clicking the "OpenAsar..." version info in the bottom of your settings sidebar, which will open the config window.
