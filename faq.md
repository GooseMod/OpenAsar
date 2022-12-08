# OpenAsar FAQ


## How it works

### What is an asar?
An asar is a format for [Electron](https://electronjs.org), commonly used for the first part of apps as `app.asar`. Discord's `app.asar` includes various parts like:
- Updater
- Bootstrapping main part of the app
- Some crash and error reporting
- Splash screen

*OpenAsar* is an open-source alternative / rewrite / etc of Discord's `app.asar` which hopes to bring the various features outlined in the readme.

### How does OpenAsar make the client "snappier" / more performant?
OpenAsar optimizes Chromium (the web engine / browser Discord uses) to help increase performance, mostly rendering, which looks like it helps makes most (~90%) people's clients looking noticeably snappier / faster generally. This is most noticeable with things like scrolling quickly, switching channels, and with various animations like tooltips for servers in the sidebar plus settings opening / closing.

### This didn't speed up Discord that much for me?
If OpenAsar wasn't that much faster (in term of startup time) you likely already have a good PC. OpenAsar speeds up most for lower-end PCs, especially those without an SSD. You will likely still notice a subtle (~1.2x) difference.

### How is this so fast?
The main speed increase (default options) is mostly accidental / coincidental (not intended) as it is mostly a side effect of rewriting it.

### How is this so small?
Compared to Discord's original, OpenAsar is <2% of the size. This is because when rewriting we remove NPM dependencies with our own custom code for more performance and efficiency.


## General

<!-- Does OpenAsar ... -->
### Does this break ToS?
Most likely, as any slight modification to Discord at all counts as breaking it. You shouldn't really be that worried though, as there is very little history of anyone being banned just for modding.

### Does OpenAsar support X mod?
Most likely, yes! OpenAsar is known to widely support BD, PC, GM, and others. It's very unlikely to cause any issues with your mods.

### Does OpenAsar update itself?
Yes, with a catch. On Windows it works out of the box, however on macOS or Linux you'll need to change the permissions for the entire resources folder for it to work.

<!-- What is ... -->
### What is Quickstart?
Quickstart "skips" a few Discord features like the splash screen and waiting for updates in favour of speed. It is currently experimental and not fully recommended for normal use.

<!-- Contributing and Licensing related -->
### Is this 100% original?
It depends on your definition.  
If by original you mean that all of this is rewritten - yes - the vast majority (~90%) is self-rewritten or modified in some way.  
If you mean using an original design - no - as we have to follow Discord APIs to maintain compatibility.

### Can I use this in my project?
Sure! Just make sure to properly [respect the license](LICENSE) and clearly / transparently credit OpenAsar.

### How can I support OpenAsar/projects/you/etc?
- **Non-financially:** Feedback, testing and reporting bugs is very helpful!
- **Financially:** I have GitHub Sponsors which lets you do a one-time or monthly donation (not necessary!) https://github.com/sponsors/CanadaHonk


## Troubleshooting

### I can still see myself typing even though I've disabled it?
That's normal and how it works, Discord still thinks you're typing but it isn't being sent out to others.
If it is, try restarting via system tray (bottom right icon).
If it still is, update to the latest OpenAsar release (reinstall to ensure).

### OpenAsar isn't installing with the batch script
Try rerunning it, and not running it as admin. If not, install it manually following this guide: https://github.com/GooseMod/OpenAsar/wiki/Install-Guide


## Custom CSS / Themes

### How can I open OpenAsar's config window?
1. Open Discord settings
2. Scroll to the bottom where the versions are (Stable ..., Canary ..., etc)
3. Click the OpenAsar version (next to the Host ...)

### How can I use Custom CSS?
Open OpenAsar's config window (see previous section), then go into the theming tab and put your Custom CSS there.

### How can I use themes with OpenAsar?
If you don't have a theme, you can find one from BD's website (you don't need BD): https://betterdiscord.app/themes  
Once you have a theme, copy and paste the contents of the CSS file (.theme.css/etc) into OpenAsar's Custom CSS (see previous section)

### My Custom CSS isn't working
Please check:
1. Your CSS is valid (we can't help you there)
2. You restarted after changing
3. If you have any imports going to github.com or raw.github.... they won't work (with any mod's custom css)
4. All the @imports are at the top of the editor (above any other code)
5. Your OpenAsar version is up to date (try reinstalling to make sure)
