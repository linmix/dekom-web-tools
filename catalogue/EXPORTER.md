# Catalogue extraction and current reports — 2.0.1

## Routine use

```powershell
node .\index.js nl-be --full
```

Full scans for nl-nl, nl-be, en-nl and en-gb automatically export raw cached HTML, generate readable reports, refresh same-language comparisons, run the existing language checks and synchronize. Filtered scans and --rescan do not export or delete catalogue data. A saved incomplete-export report no longer suppresses normal synchronization; the process retains an unsuccessful exit status. An unrelated fatal language/download failure can still interrupt the workflow; synchronization failure still requires attention.

To reuse a retained full cache without downloading:

```powershell
node .\scripts\export-catalogue.js nl-be --sync
```

To refresh comparisons from current successful exports without downloading or parsing HTML:

```powershell
node .\scripts\compare-catalogues.js --sync
```

All commands run from C:\Users\linmix\DEKOM-web. The existing FreeFileSync folder pair and exclusions remain appropriate; no configuration change is required. Drive's desktop client must finish uploading before chat reads the reports. Routine console pasting is unnecessary: tell chat which locale finished/synchronized. Local error text remains useful if execution or synchronization prevents a report reaching Drive.

## File structure and retention

| Path beneath DEKOM-web | Purpose |
|---|---|
| catalogue/exports/<locale>/catalogue.json | One current successful machine-readable dataset: manifest, products, deduplicated cards/placements, findings and accepted-change verification |
| catalogue/exports/<locale>/REPORT.md | Readable report for that successful dataset, including exact observed introductory/USP values |
| catalogue/exports/<locale>/FAILURE.md | Only the latest failed attempt, when one exists; earlier complete data is retained and may be stale |
| catalogue/comparisons/nl/REPORT.md and comparison.json | Current nl-nl versus nl-be differences and input status |
| catalogue/comparisons/en/REPORT.md and comparison.json | Current en-nl versus en-gb differences and input status |
| catalogue/review/pending-changes.json | Optional accepted-change input; created only when there are real accepted changes |
| catalogue/.staging/ | Excluded resumable checkpoints, locks and temporary publication/recovery data |
| catalogue/install-backups/ | Installation rollback files; not scan history |

There is no scan-history accumulation. Publication uses staged files and recovery journals; a failed replacement retains/restores the previous current files. Recognized old timestamp folders and latest.json are removed only after their complete data or current diagnostic report is safely migrated. Unrecognized directories/files are never deleted. SEO/language reports and accepted review decisions are unaffected.

The first 2.0.0 installation migrates the latest complete legacy export per locale, and the latest failed-attempt report if applicable. Earlier recognized catalogue export snapshots are removed from the local project; the existing mirror propagates those removals. For a locale with no successful baseline, only its current FAILURE.md is retained until a successful export. No raw cache is deleted. No export is marked complete solely to allow migration.

Each later successful export replaces the current dataset/report, removes FAILURE.md and refreshes comparisons. Failure replaces only FAILURE.md, retaining the current successful data. The report clearly distinguishes extraction completion from correctness of product content. Completed publication keeps no old copies beyond current resumable checkpoints and installation rollback files.

## Extraction and coverage

The original hash-to-URL map and raw pages are unchanged. The exporter captures main catalogue IDs, display names, exact short descriptions, ordered USP arrays, locale links, bounded descriptive evidence and product-card text/placements. Missing/extra bullets and missing introductory content remain observed empty/unusual values with content findings. No SKU, generation, kit contents, lifecycle or certification is inferred.

Ambiguous IDs/templates, duplicate main IDs, missing product HTML, unsupported structures and source-hash conflicts prevent promotion. Content findings do not. Alphabetical manufacturer-index tiles are explicitly recorded outside catalogue-card scope. Cards with an ID but missing names/links remain auditable observations with null links and empty names.

Download receipts distinguish full/filtered scope, actual status/final URL/fetch time and source hashes. Locale-root homepages such as /nl-be are valid locale URLs. Cross-locale redirects and changed sources remain exceptions. A matching recorded HTTP 404 for exactly /<locale>/documents is a documented exclusion for that non-catalogue endpoint; product failures and other non-catalogue failures are not generally ignored. The retained nl-nl historical exclusion remains tied to its exact inventory; historical transport evidence is never invented.

Complete means that the declared extraction scope passed its checks. Sitemap/route discovery and tested card structures do not prove exhaustive CMS coverage. Manufacturer naming and technical truth still require official-source review. Reports preserve source references and coverage warnings.

## Same-language comparison

The Dutch leader is nl-nl and the English leader en-nl. Match by catalogue ID; do not match similar display names or slugs automatically. Duplicate IDs are ambiguous. An entry absent from an extracted locale inventory is reported as not observed, not automatically retired or permanently unavailable.

Compare names, full ordered USP blocks, short descriptions, bounded descriptive evidence, explicit alternate links and card-text variant sets. USP capitalization, order, punctuation, spacing and wording remain visible. Source-only whitespace differences are separated from other mismatches, not discarded. Prose differences are informational review items with no automatic alignment: grammatical/factual correctness still needs assessment before classifying them as error-free. Cards are compared as observed variant sets per ID; equal placement semantics are not assumed across different pages. The machine comparison does not invent proposed official names or perform a comprehensive specification audit.

REPORT.md identifies input dates/reference IDs, full compared values (prose uses labelled excerpts), evidence URLs and bounded-evidence limits. comparison.json contains the full differences; catalogue.json retains all card placements. A pair with a missing complete baseline is BLOCKED and produces no inferred missing-publication findings. A newer failed attempt yields STALE INPUT even when older complete data remains available.

## Optional accepted-change log

The Product Database remains the editorial authority. Use this small input only as an exported/linked view of accepted decisions, not a competing ledger. The exporter reads it without overwriting accepted decisions or inventing a log when no decisions exist.

```json
{
  "changes": [
    {
      "change_id": "EXAMPLE-001",
      "catalogue_id": "1989",
      "locale": "nl-be",
      "field": "bullets",
      "accepted_value": ["Exact approved bullet 1", "Exact approved bullet 2", "Exact approved bullet 3"],
      "status": "accepted",
      "decision_source": "Link or key in Product Database"
    }
  ]
}
```

Supported automatic fields: display_name (string), short_description (array of paragraph strings), bullets (ordered string array). Reports mark Verified, Pending, Not observed, Ambiguous identity or Unsupported field/manual verification. Equality is exact and case-sensitive. This checks the freshly observed publication; it does not modify the CMS or rewrite the decision log. Withdrawn/cancelled entries are not checked. No automatic purge of accepted decisions is performed.

## Installation and recovery

INSTALL.js verifies existing known files, backs up replacements, preserves root project documentation and appends a current-status note. It does not run a new scan. It converts recognized existing exports and generates reports locally; run the existing sync to publish, or export a retained cache with --sync. An installation conflict stops before code changes.

Publication locks prevent overlapping report replacements. Interrupted transactions are recovered on the next publication, and unchanged HTML parser checkpoints can be reused across this reporting update. Avoid running simultaneous scans, exports or manual synchronizations. An operational export error attempts to save FAILURE.md; if disk/permission failure prevents that too, console error text is necessary.

Validation uses original samples, production export fixtures, same-language difference fixtures, migration/retention tests, replacement rollback/recovery tests and full-scan integration tests. The first local run remains the final validation of actual Windows file/sync behaviour.

## Sitemap/template correction in 2.0.1

Sitemap discovery reads direct XML loc elements in urlset/index entries, including prefixed XML, and preserves support for Dutch newline-delimited URL lists. XML namespace declarations, alternate-language hrefs and image loc elements are not page discovery. Sitemap indexes are followed with cycle/depth protection; external-host entries are warned about and not crawled. Invalid/empty sitemap responses stop before the existing cache-clearing stage. No new dependency is required.

For a retained cache that already includes the exact sitemaps.org sitemap-0.9 namespace URI, that URI is explicitly recorded as non-content scope and not parsed as a locale page. Mapped non-content exclusions are counted separately from read HTML; input coverage is reconciled without inventing a successful content fetch. No generic off-site or failed-page ignore rule is introduced into extraction.

A unique explicitly styled list--icon block defines the product USP block. Other introductory lists are preserved separately, including empty lists, and reported for review. Two competing styled lists or multiple unstyled lists remain ambiguous and blocking. Logo-backed index tiles with a malformed alphabetic anchor are classified outside catalogue-card scope; their names/anchors are retained and warned about rather than discarded. Product cards with unresolved identity remain exceptions or content findings according to the existing rules.

Parser checkpoints are versioned, so the first corrected export reparses retained HTML once. No new full scan is required. Current-only retention, readable reports, synchronization of diagnostics and comparison locations are unchanged.
