# AEN Docs

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
