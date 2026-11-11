# Catalogue export and Google Drive publication protocol

Approved design, 19 October 2026. The exporter and automatic hook are not yet installed. This document defines the required extension and the transfer scope; it does not introduce a command that is already available.

## Existing working environment

Authoritative project: `C:\Users\linmix\DEKOM-web`.

FreeFileSync folder pair:

- Left: `C:\Users\linmix\DEKOM-web`
- Right: `G:\My Drive\DEKOM-Web`

Existing invocation chain: successful root workflow → `modules/syncGdrive.js` → `scripts/sync-gdrive.ps1` → `scripts/DEKOM_web_gdrive_sync.ffs_batch`. The PowerShell wrapper calls `C:\Program Files\FreeFileSync\FreeFileSync.exe` and checks its result. Keep this tested invocation chain and the folder pair.

Full scans and filtered SEO scans reuse the same `cache/<locale>/pages/` and `text/` directories. A new crawl clears the previous page/text cache. Full-scan URL lists and reports can remain after their corresponding HTML has been replaced. A URL list is not evidence that all its source pages still exist.

The active URL map is `{hash: source URL}`. A saved page is `cache/<locale>/pages/<hash>.html`. The current text extractor instead creates `<hash>-visible.txt` and `<hash>-hidden.json`; those flattened/scanner-specific outputs are not the primary catalogue source.

## Approved export addition

Use the original cached HTML and the project's existing Cheerio parser to generate structured catalogue observations. The same full scan also includes non-catalogue content pages; inspect their card components and emit only compact card records.

Publish these outputs under the authoritative project root:

| Relative path | Role | Sync |
|---|---|---|
| `catalogue/README.md` | This protocol | Yes |
| `catalogue/exports/<locale>/<run-id>/manifest.json` | Input provenance, coverage, failures, schema/version and completeness | Yes |
| `catalogue/exports/<locale>/<run-id>/products.json` | Product names, descriptions, ordered USP blocks, IDs, locale links and bounded identity evidence | Yes |
| `catalogue/exports/<locale>/<run-id>/cards.json` | Card strings/subsets plus source and placement references | Yes |
| `catalogue/exports/<locale>/latest.json` | Points to the latest complete run, without duplicating its data | Yes |
| `catalogue/review/` | Manufacturer packets, parity findings and decision/verification views | Yes |
| `catalogue/.staging/` | In-progress output, validation scratch files and temporary generation | No |
| `cache/<locale>/pages/` | Bulk raw HTML | No; existing exclusion retained |
| `cache/<locale>/text/` | Bulk extracted scanner text | No; existing exclusion retained |

Use a unique run ID containing a UTC timestamp and a collision-resistant suffix. Never overwrite an immutable completed snapshot. Review and verification records identify their input run IDs.

The complete output size is not yet measured. The original three-page nl-nl pilot reduced 904,530 bytes of HTML to 28,939 bytes of structured output, including card occurrences (96.8% smaller). This supports compact publication without transferring full caches. Avoid multiplying identical card text across every placement: deduplicate content while preserving placement references and changed values.

## Processing and publication sequence

Once the exporter is installed:

1. Run the existing full-scan workflow, or reuse a retained full cache whose selected URLs, map and actual files reconcile. Do not repeat a download solely to make an export.
2. Capture per-page download metadata for new runs where available: requested URL, hash, actual fetch time, HTTP status, final URL and failure information. Keep unknown values null for historical caches; do not derive a 200 status from the existence of HTML. Record successful mapping/receipts only after the file write succeeds.
3. Extract into `catalogue/.staging/`. Identify the main product independently of cards, preserve the exact introductory description and full three/four-USP block, and inspect cards across the full retained page set.
4. Reconcile expected catalogue candidates, downloaded files, parsed records and exceptions. Report product-record coverage and card-placement coverage separately. An unexplained missing/duplicate ID or parsing failure must remain visible.
5. Finalize the immutable run and update `latest.json` only when its completeness checks pass. Save partial diagnostics separately without replacing the latest complete baseline. The pipeline must report a catalogue-export failure separately from the existing language-audit result; neither may silently claim the other succeeded.
6. Invoke the existing synchronization after publication completes. Do not run FreeFileSync concurrently with staging/promotion. A partial scan leaves the last complete catalogue export and its pointer unchanged.
7. Confirm the expected run ID is visible online. FreeFileSync success to the local `G:` location does not independently prove that the Google Drive client has completed its online upload.
8. The chat reads compact exports, produces manufacturer review batches and makes selective live checks. Error-free prose differences are reported without an immediate change task; same-language USP blocks must match in count, order, text and formatting.

Until this extension is installed, the existing full-scan command does not generate these catalogue files automatically. Preserve any retained full cache needed for the first export. Do not ask for another scan merely because the online catalogue export has not been implemented yet.

## FreeFileSync configuration

The inspected batch uses include `*`. Completed `catalogue/exports/`, `catalogue/review/` and documentation therefore require no new include rule and no extra folder pair.

Retain these existing exclusions:

```text
\cache\*\pages\
\cache\*\text\
\node_modules\
\SEO\.tmp.drivedownload\
\SEO\.tmp.driveupload\
```

Add these narrowly scoped exclusions:

```text
\catalogue\.staging\
\catalogue-audit-pilot\
\catalogue-audit-pilot.zip
```

The last two prevent disposable pilot/sample-HTML material from continuing to travel with the project. They do not exclude the persistent `catalogue` folder. Existing excluded copies already on Drive are not automatically cleaned up by adding an exclusion; no deletion is part of this update.

The prepared replacement `scripts/DEKOM_web_gdrive_sync.ffs_batch` changes only those three exclusions. It preserves the existing XML format, comparison settings, synchronization direction, deletion policy, folder pair and wrapper. Use FreeFileSync's comparison preview after installation to verify that completed catalogue outputs are included and staging/raw caches are excluded.

## Preservation and source of truth

Keep accepted decision sources and every input snapshot referenced by a review or verification. The existing mirror has permanent deletion configured, so deleting included local snapshots can delete the mirrored files. No automatic export-retention cleanup is included in the initial extension.

Partial crawls may clear disposable raw cache files; they must not clear `catalogue/exports/` or accepted decisions. A later observed page change cannot replace an accepted final value. The Product Database remains the existing editorial workflow; any machine-readable decision export must reflect its authoritative record rather than create a competing ledger.

Make documentation and batch changes in the authoritative local project, then synchronize normally. Do not maintain independent edits only in the Drive mirror: the next local-to-Drive sync can replace them.

## Installation status

This package contains prepared documentation and a proposed minimal batch-file change. It does not install an exporter, modify download code, run a synchronization or change the Windows project. Install the implementation and its associated documentation together after the exporter has been validated. The approved audit method does not require a second approval.

Source references: project `README.md`, `RUNBOOK.md`, `scripts/DEKOM_web_gdrive_sync.ffs_batch`, `scripts/sync-gdrive.ps1`, `modules/syncGdrive.js`, `modules/downloadPages.js`, `modules/runAudit.js`, `modules/extractText.js` and `package.json`, read from the current Drive mirror on 19 October 2026. FreeFileSync filter rules: https://freefilesync.org/manual.php?topic=exclude-files
