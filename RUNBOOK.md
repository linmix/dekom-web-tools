# DEKOM Web Audit Runbook

Practical commands for recurring DEKOM website audit operations.

This file complements `README.md`.

- `README.md` explains the project architecture, configuration, report structure, and normal workflows.

- `RUNBOOK.md` answers operational questions such as **“Which command do I run now?”**, particularly when only part of the audit pipeline needs to be repeated.

Successful root-level workflows automatically synchronize the current project state to the Google Drive `DEKOM-Web` mirror. The terminal reports `Google Drive sync: OK`, `WARNING`, or `FAILED`; no separate sync command is normally required.

---

## Site IDs

Supported site IDs:

| Site ID | Site                     |
| ------- | ------------------------ |
| `en-nl` | Netherlands – English    |
| `en-gb` | United Kingdom – English |
| `nl-nl` | Netherlands – Dutch      |
| `nl-be` | Belgium – Dutch          |

Replace `<site-id>` in the commands below with one of these IDs.

Example:

```
node index.js en-nl --rescan
```

---

# 1. Run a new standard audit

Use this for the normal filtered website audit.

```
node index.js <site-id>
```

Example:

```
node index.js en-nl
```

A standard audit:

1. loads the site's sitemap;

2. writes `cache/<site-id>/urls-all.json`;

3. applies the configured URL filters;

4. writes `cache/<site-id>/urls-check.json`;

5. creates a dated URL snapshot;

6. clears the existing page/text crawl cache;

7. downloads the selected pages;

8. extracts visible and hidden text;

9. runs the configured language scanner;

10. writes the JSON reports;

11. generates `report.md`.

Standard reports are stored under:

```
reports/<site-id>/
```

---

# 2. Run a new full-site audit

Use this when every URL in the sitemap should be checked rather than only the normally filtered audit set.

```
node index.js <site-id> --full
```

Example:

```
node index.js en-nl --full
```

A full audit bypasses the normal URL include/exclude filters.

The selected URLs are stored in:

```
cache/<site-id>/urls-full.json
```

Full reports and report history are kept separately under:

```
reports/<site-id>/full/
```

Use a full audit when the purpose is to inspect the entire sitemap tree rather than the normal recurring audit scope.

---

# 3. Rescan an existing standard crawl without downloading pages

Use this after changing a language dictionary or scanner rule when the existing downloaded/extracted page cache is still valid.

```
node index.js <site-id> --rescan
```

Example:

```
node index.js en-nl --rescan
```

The rescan uses:

```
cache/<site-id>/urls-check.json
cache/<site-id>/url-map.json
cache/<site-id>/text/
```

Only URLs contained in `urls-check.json` are included in the standard rescan, even if the text cache contains additional pages from a previous full-site crawl.

A cached rescan:

- does **not** reload the sitemap;

- does **not** apply the URL filters again;

- does **not** create a new URL snapshot;

- does **not** clear the page/text cache;

- does **not** download pages;

- does **not** extract the HTML again;

- **does** reload the current language dictionaries;

- **does** rerun the language scanner;

- **does** regenerate the JSON findings;

- **does** regenerate `report.md`;

- **does** archive the previous report JSON where applicable.

Typical use:

> A dictionary entry produced false positives. Correct the dictionary, then run `--rescan` instead of downloading the site again.

Example:

```
node index.js en-nl --rescan
```

---

# 4. Rescan an existing full-site crawl without downloading pages

Use this after changing a dictionary or scanner rule when a full-site crawl has already been completed and its extracted text is still valid.

```
node index.js <site-id> --full --rescan
```

Example:

```
node index.js en-nl --full --rescan
```

The rescan uses:

```
cache/<site-id>/urls-full.json
cache/<site-id>/url-map.json
cache/<site-id>/text/
```

The command skips sitemap loading, filtering, downloading, and text extraction and reruns the language scanner against the cached full-site content.

Full rescan reports are written under:

```
reports/<site-id>/full/
```

Typical use:

> A full crawl has already downloaded hundreds of pages, but a dictionary error caused false positives. Correct the dictionary and use `--full --rescan` rather than downloading the entire site again.

---

# 5. Standard versus full rescan

The two cached-rescan commands are intentionally separate.

### Standard

```
node index.js <site-id> --rescan
```

Uses:

```
urls-check.json
```

and writes reports under:

```
reports/<site-id>/
```

### Full

```
node index.js <site-id> --full --rescan
```

Uses:

```
urls-full.json
```

and writes reports under:

```
reports/<site-id>/full/
```

The cached `text/` directory may contain more pages than the requested audit scope. The scanner restricts the rescan to the URLs belonging to the selected standard or full scope.

---

# 6. When NOT to use `--rescan`

Do not use `--rescan` when the website itself needs to be checked for changes.

For example, do not use it when:

- pages may have been edited since the previous crawl;

- pages may have been added or removed;

- the sitemap may have changed;

- the URL filtering configuration has changed and the new selection needs to be calculated;

- HTML extraction logic has changed;

- visible/hidden text extraction logic has changed;

- the existing cache is incomplete or obsolete.

In those cases, run a new standard or full audit:

```
node index.js <site-id>
```

or:

```
node index.js <site-id> --full
```

Use `--rescan` when the **cached page content is still valid but the interpretation of that content has changed**.

---

# 7. Compare standard audit reports

Run:

```
node compare-reports.js <site-id>
```

Example:

```
node compare-reports.js en-nl
```

This compares the current standard report with the previous archived standard report.

Output is written under:

```
reports/<site-id>/history/
```

Standard and full histories are intentionally separate.

---

# 8. Compare full-site audit reports

Run:

```
node compare-reports.js <site-id> --full
```

Example:

```
node compare-reports.js en-nl --full
```

This compares the current full-site report with the previous archived full-site report.

Output is written under:

```
reports/<site-id>/full/history/
```

---

# 9. Compare site structures

Run:

```
node compare-sites.js
```

This compares the currently cached site structures across:

```
en-nl
en-gb
nl-nl
nl-be
```

The comparison uses canonical logical paths rather than raw locale URLs.

Use this for structural parity checks between the four DEKOM sites.

---

# 10. Quick command reference

| Task                         | Command                                    |
| ---------------------------- | ------------------------------------------ |
| New standard audit           | `node index.js <site-id>`                  |
| New full audit               | `node index.js <site-id> --full`           |
| Rescan cached standard audit | `node index.js <site-id> --rescan`         |
| Rescan cached full audit     | `node index.js <site-id> --full --rescan`  |
| Compare standard reports     | `node compare-reports.js <site-id>`        |
| Compare full reports         | `node compare-reports.js <site-id> --full` |
| Compare site structures      | `node compare-sites.js`                    |

---

# 11. Decision guide

If you are unsure which command to use:

**Has the website content changed, or do you want to check whether it changed?**

Yes:

```
node index.js <site-id>
```

or, for the entire sitemap:

```
node index.js <site-id> --full
```

**Is the cached website content still valid, but you changed a dictionary or language-scanning rule?**

Yes:

```
node index.js <site-id> --rescan
```

or, for the cached full-site scope:

```
node index.js <site-id> --full --rescan
```

**Do you want to measure how the findings changed between scans?**

Standard:

```
node compare-reports.js <site-id>
```

Full:

```
node compare-reports.js <site-id> --full
```

**Do you want to compare page structures between DEKOM country/language sites?**

```
node compare-sites.js
```


# Catalogue data for naming and consistency reviews

**Status:** approved publication protocol; exporter/automatic hook not yet installed. See [catalogue/README.md](catalogue/README.md) for exact folders, fields, coverage checks and FreeFileSync scope. No new executable command is introduced by this documentation update.

- The ordinary filtered/SEO scan does not supply catalogue content and clears the same raw cache used by a full scan.
- Before starting a new full scan, check whether a valid retained full cache can be exported. A fresh scan is required only when its source is missing/stale or the inventory needs refreshing.
- After installation, export compact catalogue data before the existing automatic Drive synchronization; save complete runs in `catalogue/exports/<locale>/<run-id>/`, outside `cache`.
- Partial scans must preserve completed catalogue exports. Failed/incomplete extraction must not replace `latest.json`.
- Sync completed exports and review packets through the existing local-to-Drive folder pair. Keep raw caches, catalogue staging and pilot working material excluded.
- Confirm the expected run ID online before asking chat to compare the export.
- Compare the same-language pairs nl-nl/nl-be and en-nl/en-gb. Report correct prose differences with no immediate action; flag/correct USP block differences in text, capitalization, spacing, punctuation, count and order through the normal decision workflow.
- Preserve review decisions and their source run IDs so later work can resume.


<!-- dekom-catalogue-export-1.0.0 -->
## Catalogue exporter installed — 1.0.0

The catalogue exporter is now installed. This status supersedes earlier references to the exporter being planned/not yet installed. Full downloads through `node index.js <locale> --full` now export supported catalogue locales before language scanning and synchronization. Filtered scans and `--rescan` do not export. For retained full caches use `node scripts/export-catalogue.js <locale> --sync`. Read [catalogue/EXPORTER.md](catalogue/EXPORTER.md) for validation, exceptions, backups and recovery.


<!-- dekom-catalogue-export-1.0.1 -->
## Catalogue exporter updated — 1.0.1

The catalogue exporter is now installed. This status supersedes earlier references to the exporter being planned/not yet installed. Full downloads through `node index.js <locale> --full` now export supported catalogue locales before language scanning and synchronization. Filtered scans and `--rescan` do not export. For retained full caches use `node scripts/export-catalogue.js <locale> --sync`. Read [catalogue/EXPORTER.md](catalogue/EXPORTER.md) for validation, exceptions, backups and recovery.


<!-- dekom-catalogue-export-2.0.0 -->
## Catalogue current reports — 2.0.0

This current-status section supersedes earlier catalogue snapshot-retention and file-layout instructions. Keep one current successful `catalogue.json` and readable `REPORT.md` per locale under `catalogue/exports/<locale>/`. A failed attempt keeps that complete baseline and replaces `FAILURE.md`; failures now synchronize after language scanning. Same-language reports are regenerated under `catalogue/comparisons/nl/` and `catalogue/comparisons/en/`. Superseded recognized catalogue snapshots are removed after their data/report is safely migrated or replaced. SEO/language reports are not changed. Read [catalogue/EXPORTER.md](catalogue/EXPORTER.md) for commands, pending-change verification and coverage limits.


<!-- dekom-catalogue-export-2.0.1 -->
## Catalogue current reports — 2.0.1

This current-status section supersedes earlier catalogue snapshot-retention and file-layout instructions. Keep one current successful `catalogue.json` and readable `REPORT.md` per locale under `catalogue/exports/<locale>/`. A failed attempt keeps that complete baseline and replaces `FAILURE.md`; failures now synchronize after language scanning. Same-language reports are regenerated under `catalogue/comparisons/nl/` and `catalogue/comparisons/en/`. Superseded recognized catalogue snapshots are removed after their data/report is safely migrated or replaced. SEO/language reports are not changed. The 2.0.1 correction reads XML loc entries instead of namespace declarations, retains extra introductory lists, and recognizes logo index tiles with malformed anchors. Read [catalogue/EXPORTER.md](catalogue/EXPORTER.md) for commands, pending-change verification and coverage limits.
