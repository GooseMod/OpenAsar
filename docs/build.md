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
node scripts/pack.js --version nightly-$(git rev-parse --short HEAD) --output tmp/openasar-build/app.asar
```

This build updates from the default upstream release repo:

```text
GooseMod/OpenAsar
```

## Build With A Custom Update Repo
Use this when you want a build to self-update from your own fork releases instead of upstream.

```bash
node scripts/pack.js --update-repo owner/repo --version nightly-$(git rev-parse --short HEAD) --output tmp/openasar-build/app.asar
```

## Build With Auto-Update Disabled
Use this for local testing when you do not want the built `app.asar` to replace itself with the upstream nightly release on launch.

```bash
node scripts/pack.js --disable-autoupdate --version nightly-$(git rev-parse --short HEAD)-localtest --output tmp/openasar-build/app.asar
```

## Output
All commands above produce:

```text
tmp/openasar-build/app.asar
```

## Optional GitHub Workflows
The default upstream workflow remains in `.github/workflows/nightly.yml`.

Additional opt-in workflow templates are included for forks:

- `.github/workflows/nightly-disable-autoupdate.yml`
- `.github/workflows/nightly-custom-update-repo.yml`

Both templates now mirror the main nightly pipeline structure more closely:

- build an `app.asar`
- run the same Linux and Windows startup smoke tests
- publish a release in the repo where the workflow runs

The custom update repo workflow is manual-only and requires editing:

```text
UPDATE_REPO: 'owner/repo'
```

before use so releases point at the correct fork.

The intended differences are:

- `nightly-disable-autoupdate.yml`: packs with `--disable-autoupdate`
- `nightly-disable-autoupdate.yml`: publishes `nightly-no-autoupdate`
- `nightly-custom-update-repo.yml`: packs with `--update-repo owner/repo`
- `nightly-custom-update-repo.yml`: publishes `nightly-fork`
