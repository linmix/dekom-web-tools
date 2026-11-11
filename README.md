# DEKOM-Web: automatic standard rescan after --full

## Installation

1. Back up `DEKOM-web/index.js`.
2. Replace it with the included `index.js`. No other project files change.
3. In the project root run `node --check .\index.js`.

## Behaviour

- `node .\index.js nl-nl` — regular filtered audit, then one Google Drive sync.
- `node .\index.js nl-nl --full` — full audit (`reports/nl-nl/full/`), cached standard rescan (`reports/nl-nl/`), then **one** Google Drive sync.
- `node .\index.js nl-nl --rescan` — standard cached rescan, then one Google Drive sync.
- `node .\index.js nl-nl --full --rescan` — existing full cached rescan behaviour, then one Google Drive sync (does **not** download pages).

## Important existing behaviour

The standard rescan uses `cache/<site>/urls-check.json` and the current `cache/<site>/text` files. The full scan refreshes `urls-full.json` but does not refresh `urls-check.json`. Therefore the filtered report represents the **last stored filtered URL selection** (and may warn about missing cached text), not necessarily a newly filtered sitemap. This patch intentionally leaves URL-selection rules unchanged.

`runAudit.js` can report a catalogue export error by setting `process.exitCode = 2` while resolving normally, so the follow-up rescan and Drive sync still run, preserving its existing intention to sync diagnostic output.

## Verification

Run `node .\index.js nl-nl --full`; confirm the log shows the full audit, then `STANDARD cached rescan`, then one `Syncing project with Google Drive...` line. Check timestamps for both `reports/nl-nl/full/report.md` and `reports/nl-nl/report.md`.

For a quick no-download check use `node .\index.js nl-nl --rescan`. No site scans or Drive syncs were executed while preparing this patch.

test
