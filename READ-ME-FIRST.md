# Prepared documentation and synchronization changes

These are local-project replacement candidates, not an installed update. Extract this package into a separate review folder. Do not extract it over the DEKOM-web root.

- README.md and RUNBOOK.md preserve the inspected source and append the approved catalogue-publication protocol.
- catalogue/README.md is the new detailed protocol.
- scripts/DEKOM_web_gdrive_sync.ffs_batch adds exactly three exclusion items, with every other XML setting preserved.
- The .diff files show the proposed changes. No executable installer or modified download/audit modules are included.

The exporter still needs implementation and validation. Install the documentation/configuration alongside that implementation in the authoritative local project, then synchronize normally. Do not edit only the mirrored Drive versions. Keep the existing folder pair.

FreeFileSync XML structure and the exact exclusion-only change were checked programmatically. The revised batch has not been executed in Windows/FreeFileSync; use its comparison preview when installed.
