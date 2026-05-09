# Local Build

The GitHub nightly workflow builds OpenAsar by:

- stamping a `nightly-<commit>` version into `src/index.js`
- stripping the `src/` tree with `node scripts/strip.js`
- packing the final archive with `asar pack`

For local builds, use `scripts/pack.js`, which follows that same flow without modifying your working tree in place.

## Requirements
- `node`
- `asar`

Example install for `asar`:

```bash
npm i -g asar
```

## Build With Normal Auto-Update Behavior
This keeps the default OpenAsar self-update behavior enabled.

```bash
node scripts/pack.js --version nightly-$(git rev-parse --short HEAD) --output tmp/app.asar
```

This build updates from the default upstream release repo:

```text
GooseMod/OpenAsar
```

## Build With A Custom Update Repo
Use this when you want a build to self-update from your own fork releases instead of upstream.

```bash
node scripts/pack.js --update-repo owner/repo --version nightly-$(git rev-parse --short HEAD) --output tmp/app.asar
```

## Build With Auto-Update Disabled
Use this for local testing when you do not want the built `app.asar` to replace itself with the upstream nightly release on launch.

```bash
node scripts/pack.js --disable-autoupdate --version nightly-$(git rev-parse --short HEAD)-localtest --output tmp/app.asar
```

## Output
All commands above produce:

```text
tmp/app.asar
```
