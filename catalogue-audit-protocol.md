# DEKOM catalogue naming and consistency review

Approved protocol — 19 October 2026, incorporating the user's editorial and synchronization feedback.

**Project:** DEKOM Product Catalogue. **Locales:** nl-nl, nl-be, en-nl, en-gb.

**Inspection method approved:** compact, versioned exports generated locally from full-scan HTML, with selective live checks for ambiguity and publication verification. The original-cache pilot passed. Export integration and the complete four-locale inventory remain to be implemented; the naming audit has not started. No catalogue or Product Database values have been changed.

## 1. Initial distribution and inventory limits

| Locale | Initial live sitemap URLs | Catalogue URL candidates |
|---|---:|---:|
| nl-nl | 845 | 615 |
| nl-be | 842 | 615 |
| en-nl | 845 | 615 |
| en-gb | 845 | 619 |
| Total | 3,377 | 2,464 |

These observations were collected on 19 October 2026. They are URL candidates, not verified product/SKU counts or confirmed locale equivalents. Equal counts do not prove equal membership. The four additional en-gb URLs are not established as four additional products.

The provisional discovery rule selects four-segment paths including locale: `/<locale>/<Category>/<Manufacturer>/<Product>`, with an uppercase initial category character. Validate this heuristic against catalogue IDs, template markers, product-card links, Product Database URLs and any available CMS inventory. Preserve excluded-pattern exceptions and out-of-sitemap discoveries. Do not silently treat a route heuristic as a definitive classifier.

Read Dutch sitemap responses as either newline-delimited URLs or XML as applicable; the pilot's Dutch responses were plain URL lists, while its English responses were XML.

The refreshed nl-nl full-scan map subsequently contained 843 downloaded URLs, including the same 615 catalogue candidates. Different inventory and scan counts must be reconciled by URL and coverage evidence, not assumed to represent the same successful download set.

## 2. Pilot findings and paired-language policy

### Inspection results

| Sample | Observed shared catalogue ID | Scope |
|---|---|---|
| Logitech Rally Bar | 1989 | Individual model |
| Logitech Rally Bar for Google Meet | 3946 | Kit-labelled entry; exact commercial package unresolved |
| SMART Board MX Series | 1829 | Series; generation/SKU scope unresolved |

All three were inspected in each locale: 12 live product pages. Names, introductory short descriptions, main USP bullets, catalogue IDs, four relevant locale links and card occurrences could be extracted. No canonical link was found in the 12 samples. Locale links are mapping evidence, not independent proof of a valid matching publication.

Three original nl-nl full-scan HTML files were then collected using the real hash-to-URL map. All three extracted without errors and were byte-for-byte identical to the earlier independently fetched nl-nl samples. Their compact output was 28,939 bytes from 904,530 bytes of HTML: **96.8% smaller**, including 102 card occurrences. A second run reused all three records. The earlier 12-page pilot also demonstrated interrupted resumption and four repeated live checks with identical product fields.

This establishes feasibility, not universal template coverage. The other locales were tested through live HTML retrieval; their original cached exports still require coverage checks. HTTP status and final redirect URLs were not supplied with the original-cache sample and remain unknown in that output. Saved HTML alone cannot establish those transport facts.

### Paired-language content

The same-language pairs are **nl-nl ↔ nl-be** and **en-nl ↔ en-gb**. They should normally share content for equivalent catalogue entries. Report differences explicitly, including short and detailed descriptive copy where available, and classify them:

| Finding | Treatment |
|---|---|
| Prose differs, but both versions are grammatical, factual, clear and otherwise correct | Report as **Different — no immediate action**. Retain both current values; do not create an urgent rewrite solely to make them identical. |
| A grammatical, factual, terminology, spelling, naming, identity or other substantive error is found | Propose a correction with the relevant evidence. Apply the accepted wording to both members of the pair where applicable. |
| A difference is justified by a documented regional fact | Record the exception and its evidence. Do not propagate the regional fact to the other locale. |
| Identity or package scope is uncertain | Mark unresolved. Do not settle the identity by copying the leader's wording. |
| USP block differs | Apply the strict USP rule below; correct language and formatting differences through the normal decision workflow. |

### Strict rule for USP bullets

The **three, sometimes four, bullets immediately after the first short description** are the product's USP block. For equivalent entries, that complete block must match within each same-language pair: number, order, wording, capitalization, spelling, accents, spacing, punctuation and unit notation. Compare decoded displayed strings and retain the raw observations; classify incidental source/outer whitespace separately without hiding it. USP differences remain consistency findings even when both variants are individually grammatical and factual. They need an agreed correction, although minor formatting can be batched rather than treated as an emergency.

A regional USP exception requires specific evidence and an explicit decision; it must not be inferred merely because the strings differ. Between Dutch and English, verify corresponding claims and approved terminology, not literal string equality.

The audit may preserve an existing four-USP block. Do not delete a fourth USP merely to satisfy the three-USP rule for newly produced packages. For a newly created or explicitly rebuilt USP selection, use the three verified canonical USPs required by the product-package specification. Do not silently change the canonical vocabulary itself; flag any glossary correction for a separate decision.

### Product cards and targeted technical findings

A product card can display fewer USP items than the product page: the sampled Rally Bar page showed four and a related card showed three. Capture the complete page USP block and card occurrences separately. Compare equivalent card components/subsets; a documented layout limit does not explain changed capitalization or changed wording. An unexplained omission, changed order or inconsistent label is a finding, not permission for an automatic rewrite.

The SMART English overviews differed in sentence construction: this is reported, with no immediate action if both are otherwise correct. The Dutch SMART USP whitespace differences and English size punctuation are formatting findings under the strict USP rule.

Rally Bar's Dutch description also contradicted its technical section about optical versus combined zoom. Verify that specific contradiction without expanding the review into a comprehensive specification audit. The Google Meet kit question already exists as **LOG-017** in the Product Database's Identity review tab; link to it rather than duplicate it. A common catalogue ID does not establish the kit BOM. A SMART family label must not inherit the latest generation's specifications without identity evidence.

## 3. Inspection-method decision

| Method | Evidence and limits | Decision |
|---|---|---|
| Full-scan HTML → compact local export | Passed on the original nl-nl sample; deterministic fields and resumable processing. Requires complete retained input, template validation and an exception queue. | Primary inventory and comparison source. |
| Automatic live checking from chat | All 12 sampled pages were readable, and IDs/locale links were present in raw HTML. Search, language menus and individual successful reads do not establish exhaustive catalogue discovery or sustained throughput. | Selective checks only. |
| Compact export plus selective live checks | Preserves a stable baseline and decisions while allowing current identity and publication checks. | Approved combined approach. |

The export must contain observed catalogue data. Official manufacturer pages, datasheets and exact-generation support documentation remain the naming/factual authorities. Verify certification claims separately where they affect identity or a proposed USP.

## 4. Is current Drive data sufficient, and what should change?

**Current Drive data is insufficient for catalogue-content comparison.** The mirrored URL lists and URL maps support discovery and file identification. Reports contain findings, not a complete set of product fields. Filtered SEO outputs omit catalogue scope. Raw `cache/<locale>/pages/` and `text/` directories are intentionally excluded from synchronization. Even a full-scan URL map supplies addresses, not names, descriptions or USP strings.

**A small extraction-and-publication extension is justified.** Keep the existing downloader and bulk-cache exclusions. Parse retained raw HTML with the existing Cheerio dependency, then publish only compact catalogue records and card observations to a persistent folder outside `cache`. The pilot's measured 96.8% reduction supports this choice. The complete export size, processing time and size of card-placement data remain to be measured; do not extrapolate a guaranteed catalogue-wide total from three pages.

Plain extracted text is insufficient as the primary export source: the inspected `extractText.js` removes scripts and flattens body text. This loses the main watchlist-ID script and the structural boundaries needed to distinguish introductory copy, USP blocks, features and cards.

### Download and extraction changes

1. Retain full-scan input exactly as it is now: `cache/<locale>/url-map.json` maps hash → URL and `pages/<hash>.html` stores HTML.
2. Add a catalogue extractor after downloading, before the workflow's existing Drive synchronization. Original HTML remains available even if the existing text-extraction step has already run. Do not run a second network crawl just to create the export.
3. Preserve per-run download metadata in a small receipt: requested URL, hash, actual fetch time, HTTP status and final URL where captured, plus failures and selected/full scope. The current downloader returns aggregate coverage and failures but does not persist per-page success status, final URL or fetch time. For already-cached HTML lacking a receipt, keep those values null and state the evidence gap. File modification time is not a substitute for an actual fetch timestamp.
4. Register a successful mapping/receipt only after the HTML file write succeeds. Reconcile selected catalogue candidates, successful downloads and successfully parsed product records independently.
5. Extract the product name, exact introductory description and complete ordered USP block; use the main product ID, not an ID found in a related card. Preserve primary manufacturer observations separately from recommendation-card images. Emit template/identity exceptions rather than inventing values.
6. Inspect all full-scan HTML for cards, including content, platform, solution and manufacturer pages. Export only compact catalogue-card records, not their complete containing pages. Deduplicate repeated content while retaining source-page/placement references and any different displayed values.
7. Include bounded descriptive evidence where needed to classify a model/kit/series or identify a contradiction. Keep full technical tables and unrelated page content out of the standard transfer; use the local source or selective live checks when needed.
8. Validate and publish a completed export outside the disposable cache. Partial/SEO scans must leave the last complete catalogue export intact. A failed or incomplete attempt must not become the latest complete baseline.

### Synchronization decision and exact locations

The inspected FreeFileSync batch is `scripts/DEKOM_web_gdrive_sync.ffs_batch`, invoked by `scripts/sync-gdrive.ps1` through `modules/syncGdrive.js` after successful root-level workflows.

| Purpose | Local source | Mirrored destination |
|---|---|---|
| Project folder pair, already configured | `C:\Users\linmix\DEKOM-web` | `G:\My Drive\DEKOM-Web` |
| Catalogue protocol/documentation | `catalogue/README.md` beneath the local root | `DEKOM-Web/catalogue/README.md` |
| Stable exports | `catalogue/exports/<locale>/<run-id>/` | Same relative path beneath the mirror |
| Latest complete run pointer | `catalogue/exports/<locale>/latest.json` | Same relative path beneath the mirror |
| Review packets and parity findings | `catalogue/review/` | Same relative path beneath the mirror |
| Temporary export generation | `catalogue/.staging/` | Exclude |
| Raw downloaded HTML and extracted text | `cache/<locale>/pages/` and `text/` | Continue to exclude |

The batch's include filter is `*`; therefore the completed `catalogue` folders are already eligible. **No new folder pair or include rule is needed.** Preserve the existing folder pair, synchronization direction, deletion policy, comparison options and error handling.

A small exclusion update is recommended for `\catalogue\.staging\` and the temporary `\catalogue-audit-pilot\` and `\catalogue-audit-pilot.zip` materials. The pilot folder and ZIP were visible in the Drive mirror: they are currently included by `*`, despite containing sample HTML. The updated batch in the documentation package adds only those exclusions. They prevent future transfer of working pilot material; they are not an instruction to delete existing copies.

Revise the documented upload scope and full-scan sequence in README/RUNBOOK, as supplied in the documentation package. The operational detail belongs in `catalogue/README.md`. These are prepared local replacements, not changes already installed on the user's Windows computer. Do not edit generated files directly in the Drive mirror: the local source will replace them on the next sync.

Only completed outputs should be visible to FreeFileSync. Build in excluded staging, validate, publish the completed run and then update `latest.json`. Never run a synchronization concurrently with publication. FreeFileSync completion to `G:` and Google Drive's online availability are separate checks: confirm the expected run ID online before chat consumes the new export.

Because this is a mirror with permanent deletion configured, locally deleting included snapshots can remove their mirrored copies. Keep snapshots referenced by reviews, accepted decisions and publication checks. A later partial crawl must not delete them. Do not introduce automatic retention/deletion with the first exporter.

## 5. Export contract and coverage gate

Use UTF-8 structured JSON as the authoritative observation interchange and small Markdown manufacturer packets for review. Lossless arrays preserve USP count, order and boundaries. Keep prose changes separate from USP differences in reports.

Each completed run must include:

- `manifest.json`: run ID, locale, full/partial source scope, scan/fetch dates where known, schema/parser version, input URL-list/map hashes, expected/downloaded/parsed catalogue counts, failures, missing IDs, duplicate-ID URLs, route/template exceptions and completeness state.
- `products.json`: one observed publication per catalogue ID + locale; exact name, introductory description, ordered USPs, supporting identity evidence, explicit locale links and source hash/URL. Retain separately observed duplicate URLs; never collapse them silently.
- `cards.json`: source page, placement, target ID/URL, exact displayed name/USP subset, and any component description. Identical content may be shared by reference; differing displays must remain visible.
- Bounded review packets and parity reports identifying the exact run IDs used for each locale.

Manufacturer/SKU/PID, generation and package type remain unknown unless established; a shared ID is not a SKU. Observed values, proposed wording and accepted final values are separate. For prose comparison, record differences without automatically proposing replacements. For USPs, compare exact approved language-specific labels, number and order; retain normalization-only findings too.

Before treating an inventory as complete, account for every catalogue candidate as extracted, failed, redirected/fallback, intentionally excluded with evidence, or unresolved. Confirm discovery exceptions and count distinct IDs separately from locale URLs. A prior clean report or equal counts is not sufficient.

A run with missing files or unresolved parse failures may be saved as incomplete evidence, but must not replace the latest complete baseline. Non-catalogue download failures must still be recorded because they can affect card-placement coverage. Report product-record completeness and card-placement coverage separately.

## 6. Identity and locale mapping

- Use stable catalogue IDs, corroborated by explicit alternate links and manufacturer model/generation/SKU/package evidence. Different IDs with similar names are potential duplicates, not automatic equivalents.
- Keep the Product Database's existing keys, such as LOG-017, separate from numeric catalogue IDs. Never use row number, display name or URL slug as the durable identity key.
- Record scope as model, defined kit, configurable package, family/series, accessory, software/service or unresolved. Use the supplied taxonomy separately for category/type.
- Map all four locale publications. Record confirmed present, not discovered, confirmed missing, redirect/fallback, fetch failed, mismatched identity and justified regional absence distinctly.
- A successful response at a locale homepage is not an equivalent product publication. Verify the actual final page and ID when a target is ambiguous.
- Never infer discontinuation or market unavailability solely from a missing locale entry.

## 7. Editorial standard

Use `product-package-specification.md`, `canonical-usps.md` and `product-taxonomy.md` as operational authorities, subject to the user's explicit existing-USP and paired-prose rules in section 2. This audit produces field comparisons, not full bilingual product packages by default.

Preserve official brand/model spelling, generation markers, capitalization, accents and spacing across all locales. Translate descriptive wording naturally. Use formal Dutch u/uw where applicable and retain `all-in-one` under the supplied convention. Do not apply blanket capitalization rules to protected official names.

nl-nl is the Dutch leader and en-nl the English leader. Their correct accepted wording governs corrections and future alignment; a leader's current text is not automatically correct. Report existing, error-free prose differences without requiring immediate alignment. USP blocks must match within the same-language pair unless a specific exception is evidenced and accepted.

Use official manufacturer pages, datasheets and exact-generation support documentation for factual naming authority. Certification and compatibility are different claims. Verify the exact scope and available validity/end dates when a certification claim affects identity or a proposed USP. Resolve contradictions that matter to naming/scope; route a comprehensive specification audit to separate work.

Keep uncertain kit BOMs and model generations explicitly unresolved. A display-name correction does not authorize URL changes, redirects, consolidation, deletion or retirement. Handle those through separate decisions.

## 8. Product Database and decision records

Reuse existing Product IDs, priorities, source links and Identity review entries. Preserve existing lifecycle, certification, taxonomy and package-review work. Proposed linked views/tabs are Catalogue locales, Catalogue naming review and Catalogue publication checks; none has been created during this protocol revision.

Track three independent dimensions:

| Dimension | States |
|---|---|
| Identity | Unchecked / Confirmed / Unresolved / Conflicting |
| Review disposition | Not reviewed / Different — no immediate action / Proposed / KEEP / ACCEPT / CUSTOM / Deferred |
| Publication per locale | Not checked / Pending / Live / Mismatch / Missing / Blocked |

For each finding retain identity, locale(s), field/placement, current verbatim values, proposed value if any, error/no-error assessment, evidence/date, decision and accepted final value. Error-free prose divergence can close with no implementation task. A USP mismatch requires a consistency decision even if both variants are grammatical. Preserve the original proposal when CUSTOM is chosen.

Accepted final values are the editorial source of truth. Fresh observations must not overwrite them. Catalogue decisions must not be written through SEO's title/meta-description tools. Keep the workbook and its exported decision views consistent, with one authoritative decision record rather than independent competing ledgers.

## 9. Audit sequence

1. Implement the compact export and publication receipt, then export the retained nl-nl full cache before another partial scan. Do not download it again if valid source files remain.
2. Refresh/export the other locales one at a time; verify online run IDs and coverage, then reconcile the complete identity inventory and locale matrix.
3. Establish naming conventions through a Logitech pilot: official brand/model strings, kit/series treatment, generation markers and approved EN/NL terms. Keep LOG-017 unresolved until evidence resolves it.
4. Review manageable manufacturer batches using existing priorities, initially about 10–15 related identities at a time. Keep related models/kits together.
5. Present current/proposed values with sources, unresolved questions and a clear distinction between errors, USP consistency issues and error-free prose differences.
6. Record KEEP/ACCEPT/CUSTOM/Deferred or Different — no immediate action. Implement accepted changes through the existing Pimcore workflow, then verify every affected locale and relevant card placement.
7. After the pilot and approximately every three manufacturer batches, check shared terms and naming conventions across manufacturers. Reopen only affected fields.

At batch close save the input run IDs, decisions, open identities, publication outcomes and next queue position. On resumption, reload those records and process unfinished work. Changed source hashes create targeted rechecks, not an automatic restart of completed reviews.

## 10. Implementation status and source references

The combined inspection method is approved by the user, with the paired-language and upload-protocol amendments incorporated here. Export integration, installation of prepared documentation/configuration changes, four-locale production exports and catalogue editing are not yet performed. No further method approval is required.

The existing full scan already captures the needed HTML. The worthwhile change is a small local structured-export stage and preservation of compact outputs online; replacing the downloader or syncing full caches is unnecessary. Add per-page transport metadata for future runs where straightforward, without inventing it for historical files. The existing bulk exclusions and sync wrapper remain useful.

Inspected project sources:

- `README.md`: https://drive.google.com/file/d/1MQeal6UTs3bfBW9PD0FVfuUSwFEkLJPL/view
- `RUNBOOK.md`: https://drive.google.com/file/d/1ynb_hog0ayiC0yYXTBE9nNsUnparQhsn/view
- `scripts/DEKOM_web_gdrive_sync.ffs_batch`: https://drive.google.com/file/d/1zwFIXcHfRLUlrRIxQkfTrZ9opeWzoYtS/view
- `scripts/sync-gdrive.ps1`: https://drive.google.com/file/d/16h5Y4Pltb7pn_ZJQ-2IWlhyYMJ-N9OsG/view
- `modules/syncGdrive.js`: https://drive.google.com/file/d/14D5DpDtd1xp2UYPIjU6DbxNCn8aUfAfL/view
- `modules/downloadPages.js`: https://drive.google.com/file/d/1pao_foXbOwNjXTMppB8TYUNHOB7wky9k/view
- `modules/runAudit.js`: https://drive.google.com/file/d/1sinZri9tV3LjnZWL7QcfwhAacF0Kd4Cy/view
- `modules/extractText.js`: https://drive.google.com/file/d/1HX9JUEpfE7Mw6LP8aFvAtUyW5yAl8mv1/view
- Product Database: https://docs.google.com/spreadsheets/d/1-bPypWWTzsIYi2O0Mx2eIcMepYOAnZZqwGJq8bIWsd4/edit
- FreeFileSync filter rules: https://freefilesync.org/manual.php?topic=exclude-files

Pilot naming/identity references:

- https://www.logitech.com/en-eu/products/video-conferencing/room-solutions/rallybar.html
- https://www.logitech.com/en-eu/products/video-conferencing/room-solutions/tap-ip-appliance-solutions.html
- https://www.smarttech.com/products/mx-series/education
- https://support.smarttech.com/docs/hardware/displays/smart-board-mx/en/home.cshtml

These manufacturer sources do not establish DEKOM's unresolved kit BOM or the generation represented by its SMART family entry. Exact pilot observations and original HTML remain in the evidence bundle.
