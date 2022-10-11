# OpenAsar FAQ

### What is an asar?
An asar is a format for [Electron](https://electronjs.org), commonly used for the first part of apps as `app.asar`. Discord's `app.asar` includes various parts like:
- Updater
- Bootstrapping main part of the app
- Some crash and error reporting
- Splash screen

*OpenAsar* is an open-source alternative / rewrite / etc of Discord's `app.asar` which hopes to bring the various features outlined in the readme.

### Does OpenAsar support X mod?
Most likely, yes! OpenAsar is known to widely support BD, PC, GM, and others. It's very unlikely to cause any issues with your mods.

### This didn't speed up Discord that much for me?
If OpenAsar wasn't that much faster (in term of startup time) you likely already have a good PC. OpenAsar speeds up most for lower-end PCs, especially those without an SSD. You will likely still notice a subtle (~1.2x) difference.

### How does OpenAsar make the client "snappier" / more performant?
OpenAsar optimizes Chromium (the web engine / browser Discord uses) to help increase performance, mostly rendering, which looks like it helps makes most (~90%) people's clients looking noticeably snappier / faster generally. This is most noticeable with things like scrolling quickly, switching channels, and with various animations like tooltips for servers in the sidebar plus settings opening / closing.

### How is this so fast?
The main speed increase (default options) is mostly accidental / coincidental (not intended) as it is mostly a side effect of rewriting it.

### How is this so small?
Compared to Discord's original, OpenAsar is <2% of the size. This is because when rewriting we remove NPM dependencies with our own custom code for more performance and efficiency.

### What is Quickstart?
Quickstart "skips" a few Discord features like the splash screen and waiting for updates in favour of speed. It is currently experimental and not fully recommended for normal use.

### Is this 100% original?
No, and depends on your definition. By original if you mean all of this is rewritten, the vast majority (~90%) is self-rewritten or modified in some way. If you mean original by design, etc. - no, as we have to follow Discord APIs to maintain compatibility.

### Does this break ToS?
Most likely, as any slight modification to Discord at all counts as breaking it. You shouldn't really be that worried though, as there is very little history of anyone being banned just for modding.

### Can I use this in my project?
Sure! Just make sure to properly [respect the license](LICENSE) and clearly / transparently credit OpenAsar.

### Does OpenAsar update itself?
Yes, with a catch. On Windows it works out of the box, however on macOS or Linux you'll need to change the permissions for the entire resources folder for it to work.
