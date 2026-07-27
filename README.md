# AEN Document Manager

Desktop app for Access Education Network staff to search students on
aenapply.com, see which application documents are present or missing, and
download + rename + organise them into a consistent folder structure with one
click. Built with Tauri (Rust backend) + React/Tailwind (frontend). No
database — everything is fetched live from aenapply.com.

## Development

```
npm install
npm run tauri dev
```

Rust unit tests (rename engine, checklist logic, path sanitization, and the
DataTables/detail-page parsers against hand-crafted fixtures):

```
cd src-tauri
cargo test
```

## Known limitation: unverified live endpoints

Two pieces of this app were built against a best guess because they couldn't
be verified without a real aenapply.com login:

- `src-tauri/src/students/search_parser.rs` — assumes a standard
  `yajra/laravel-datatables` JSON shape for the student search response.
- `src-tauri/src/students/detail_parser.rs` — CSS selectors for the student
  detail page (`/offerapplications/show/{id}`) are first guesses.

Both fail gracefully (empty results rather than a crash) if the real shape
differs, and both are isolated behind a single function each so a fix is a
one-file change. Once real credentials are available, capture a real
DataTables JSON response and a real detail-page HTML source, and correct the
constants at the top of each file.

## Building the Windows installer

This app targets Windows only (NSIS `.exe` installer). Building it requires
either a Windows machine or CI — a Linux/macOS dev machine cannot produce the
NSIS installer directly. A GitHub Actions workflow is included at
`.github/workflows/build-windows.yml`: push a `v*` tag (or run it manually via
"Run workflow") once this repo has a GitHub remote, and it builds the
installer on `windows-latest` and attaches it to a draft GitHub release.

To build locally on an actual Windows machine instead:

```
npm install
npm run tauri build
```

The installer will be under `src-tauri/target/release/bundle/nsis/`.

## Auto-updater

The app checks `https://github.com/ryoken-sama/aendocs/releases/latest/download/latest.json`
on launch (silently — a failed check never interrupts the app) and, if a
newer version is available, shows a modal — "Update available — install
now?" — with "Install" / "Later". "Later" doesn't ask again until the app is
next launched.

This requires every release to be signed with the same keypair the app's
`tauri.conf.json` public key was generated from:

- The **public key** is already in `src-tauri/tauri.conf.json` under
  `plugins.updater.pubkey`.
- The **private key** must be added as a GitHub Actions repo secret named
  `TAURI_SIGNING_PRIVATE_KEY` (the full contents of the private key file). If
  the key was generated with a password, also add
  `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`.

With that secret in place, `tauri-apps/tauri-action` (used by
`.github/workflows/build-windows.yml`) automatically signs the installer and
attaches `latest.json` to the GitHub release — no manual signing step needed.

To generate a new keypair (e.g. if the original is lost — note this
invalidates updates for everyone on an older version until they manually
reinstall, since old clients only trust the old public key):

```
cargo tauri signer generate --ci -w /path/outside/the/repo/aen-docs-updater.key
```

Never commit the private key file; `.gitignore` excludes `*.key`/`*.key.pub`
as a safety net, but treat the key itself (and anywhere it's been pasted,
including chat/CI logs) as sensitive.
