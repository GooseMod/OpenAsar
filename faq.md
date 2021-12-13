# OpenAsar FAQ

### What is an asar?
An asar is a format for [Electron](https://electronjs.org), commonly used for the first part of apps as `app.asar`. Discord's `app.asar` includes various parts like:
- Updater
- Bootstrapping main part of the app
- Some crash and error reporting
- Splash screen

*OpenAsar* is an open-source alternative / rewrite / etc of Discord's `app.asar` which hopes to bring the various features outlined in the readme.

### How is this so fast?
The main speed increase (default options) is mostly accidental / coincidental (not intended) as is mostly a side effect of rewriting it.

### What is Quickstart?
Quickstart skips a few Discord features like the splash screen and waiting for updates in favour of speed. It is currently experimental and not fully recommended for normal use.

### This didn't speed up Discord that much for me?
If OpenAsar wasn't that much faster (in term of startup time) you likely already have a good PC. OpenAsar speeds up most for lower-end PCs, especially those without an SSD. You might still notice a subtle (~1.25x) difference.

### Is this 100% original?
No, and depends on your definition. By original if you mean all of this is rewritten, not containing any original Discord code - not yet but we hope for v2.0. If you mean original by design, etc. - no, as we have to follow Discord APIs to maintain compatibility.