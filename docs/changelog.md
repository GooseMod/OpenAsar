# Changelog

## 2026-04-17

### BetterDiscord settings compatibility

- Investigated [OpenAsar issue #222](https://github.com/GooseMod/OpenAsar/issues/222), [PR #225](https://github.com/GooseMod/OpenAsar/pull/225), and the [TirOFlanc/OpenAsar fork](https://github.com/TirOFlanc/OpenAsar).
- Reviewed the local BetterDiscord codebase to understand how it patches Discord's settings UI.
- Identified the main failure mode in `src/mainWindow.js`: OpenAsar's settings item injection was incorrectly gated behind version/footer detection.
- Reworked the settings injection flow in `src/mainWindow.js` so version injection and menu item injection are independent.
- Kept the injected menu entry based on cloning native Discord sidebar items instead of creating fresh nodes with hard-coded Discord classes.
- Added a settings-area-scoped `MutationObserver` so the OpenAsar item can be restored after BetterDiscord or Discord rerenders the sidebar.
- Kept a slower interval fallback to retry injection without relying on a global full-page observer.
- Evaluated a hybrid settings injection path that patched Discord's internal settings layout alongside DOM injection.
- Matched the current BetterDiscord settings DOM where `Advanced` is absent and `Developer` / `Log Out` are the stable fallback anchors.
- Identified that local test builds were being overwritten on first launch by OpenAsar's self-updater.
- Added a build-time auto-update flag so local test archives can be packed with self-updates disabled intentionally.
- Kept the default source behavior with self-updates enabled unless the build flag is explicitly set.
- Added `scripts/pack.js` to build local `app.asar` files with options such as `--disable-autoupdate` and `--update-repo owner/repo`.
- Confirmed the DOM-only settings injection works once local test builds stop being overwritten by the self-updater.
- Reverted the experimental hybrid settings patch and kept the DOM-only fix for the final code path.
- Local test build command:
  `node scripts/pack.js --disable-autoupdate --version nightly-$(git rev-parse --short HEAD)-localtest --output tmp/openasar-build/app.asar`
- Added optional fork-oriented GitHub workflow templates for no-auto-update artifacts and custom update repos while leaving the main upstream nightly workflow unchanged.
- Found and fixed a pack-time stamping bug where `scripts/pack.js` only replaced the first `<updateRepo>` placeholder even though `src/index.js` used that placeholder more than once.
- Fixed that placeholder bug by changing the pack step to replace all `<updateRepo>` occurrences so packed builds do not keep half-stamped fallback logic.
- Found and fixed a runtime fallback bug where the initial `oaUpdateRepo` comparison collapsed stamped fork builds back to `GooseMod/OpenAsar` instead of preserving the custom repo.
- Fixed that runtime bug by switching the fallback check to `stampedUpdateRepo.startsWith('<')`, so unpacked source still defaults upstream while packed builds keep the explicitly stamped fork repo.
- Verified the fork-update path by packing a test build with `--disable-autoupdate --update-repo XxUnkn0wnxX/OpenAsar` and confirming the stamped temp build source kept the custom repo value.
- Expanded the two optional fork workflows so they follow the main nightly pipeline shape more closely instead of only uploading artifacts.
- Matched the extra workflows to the main pipeline by adding the same Linux stable/canary and Windows stable/canary startup smoke-test jobs plus the same release structure.
- Kept the intended workflow differences narrow: one packs with `--disable-autoupdate` and publishes `nightly-no-autoupdate`, and the other packs with `--update-repo owner/repo` and publishes `nightly-fork`.
- Verified the updated file with `node -c src/mainWindow.js`.
- Verified the repo still packs locally by producing `tmp/pack-test/app.asar`.
