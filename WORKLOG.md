# Work Log

## 2026-04-17

### BetterDiscord settings compatibility

- Investigated OpenAsar issue `#222`, PR `#225`, and the `TirOFlanc/OpenAsar` fork.
- Reviewed the local BetterDiscord codebase to understand how it patches Discord's settings UI.
- Identified the main failure mode in `src/mainWindow.js`: OpenAsar's settings item injection was incorrectly gated behind version/footer detection.
- Reworked the settings injection flow in `src/mainWindow.js` so version injection and menu item injection are independent.
- Kept the injected menu entry based on cloning native Discord sidebar items instead of creating fresh nodes with hard-coded Discord classes.
- Added a settings-area-scoped `MutationObserver` so the OpenAsar item can be restored after BetterDiscord or Discord rerenders the sidebar.
- Kept a slower interval fallback to retry injection without relying on a global full-page observer.
- Added a hybrid settings injection path that first tries to patch Discord's internal settings layout and then falls back to DOM injection.
- Matched the current BetterDiscord settings DOM where `Advanced` is absent and `Developer` / `Log Out` are the stable fallback anchors.
- Identified that local test builds were being overwritten on first launch by OpenAsar's self-updater.
- Added a build-time auto-update flag so local test archives can be packed with self-updates disabled intentionally.
- Kept the default source behavior with self-updates enabled unless the build flag is explicitly set.
- Added `scripts/pack.js` to build local `app.asar` files with options such as `--disable-autoupdate`.
- Local test build command:
  `node scripts/pack.js --disable-autoupdate --version nightly-$(git rev-parse --short HEAD)-localtest --output tmp/openasar-build/app.asar`
- Verified the updated file with `node -c src/mainWindow.js`.
- Verified the repo still packs locally by producing `tmp/pack-test/app.asar`.
