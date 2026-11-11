# DEKOM image metadata language audit

## Purpose

This audit finds image `ALT` and `TITLE` metadata in the cached DEKOM website and creates an
asset-level worklist. It is primarily useful for finding language leakage that the normal
page-language scanner may miss, especially short or mixed-language image metadata.

The image is the unit of review, not the page. The scanner deduplicates rendered image
variants and reports the underlying Pimcore asset path in human-readable form.

## Run the raw scan

From the project root:

```powershell
node .\scan-image-metadata.js nl-nl
node .\scan-image-metadata.js nl-be
node .\scan-image-metadata.js en-nl
node .\scan-image-metadata.js en-gb
```

For help:

```powershell
node .\scan-image-metadata.js --help
```

The scanner reads the existing cached HTML. It does not require a new language-detection scan.

## Raw output

For each site the scanner writes:

```text
/reports/<site>/images/
    image-metadata.json
    image-metadata.md
```

These are disposable raw scan results. A later raw scan may overwrite them.

The raw report:

- scans all cached HTML pages;
- deduplicates images by their underlying Pimcore asset;
- strips Pimcore thumbnail/rendering paths from the displayed asset path;
- decodes URL encoding such as `%20` for readability;
- omits images with neither ALT nor TITLE metadata;
- separates assets into:
  - `FILTERED PAGES` — the image occurs on at least one URL in `urls-check.json`;
  - `OTHER CACHED PAGES` — the image occurs only outside that filtered set;
- keeps the Pimcore asset/node ID in JSON as technical reference;
- does not list page URLs because image metadata is edited on the asset itself.

## Intelligent language cleanup

The raw scanner deliberately does **not** try to decide whether metadata is really German.
Short ALT/TITLE strings, product names and mixed-language phrases require contextual judgement.

For Dutch sites:

1. Attach `image-metadata.json` to the DEKOM Web Cloud ChatGPT project.
2. Ask ChatGPT to retain only:
   - German metadata;
   - plausibly German metadata;
   - mixed-language metadata containing German.
3. Ask it to remove:
   - clearly Dutch-only metadata;
   - clearly English-only metadata;
   - brand/product names without meaningful German text;
   - neutral strings that do not need correction.
4. Preserve the `filtered` and `other` sections.

The reviewed outputs are:

```text
image-metadata-clean.json
image-metadata-clean.md
```

`image-metadata-clean.json` is the canonical reviewed dataset.

`image-metadata-clean.md` is the human-readable correction worklist. It should be derived from
the cleaned JSON so that the two do not diverge.

For the current workflow ChatGPT can generate both files together. A separate local
JSON-to-Markdown renderer is optional; it is only worth adding if this becomes frequent enough
that regenerating the Markdown independently is useful.

## Priority

Work through `FILTERED PAGES` first. These assets occur on pages that are already in the
important filtered site set.

`OTHER CACHED PAGES` is a lower-priority backlog. It commonly contains product-page images
that do not justify interrupting higher-priority SEO/content work.

ALT text deserves more attention than image TITLE metadata. If an asset is being corrected,
however, fix both fields when either contains the wrong language.

## Correcting an asset in Pimcore

Use the human-readable path in the Markdown report to locate the asset. Example:

```text
/manufacturers/ctouch/3 – products/Touch Screen/CTOUCH Neo/ctouch_neo_writing.jpg
```

The JSON may also contain:

```json
"assetId": 13229
```

The asset ID is stable and useful as a technical reference, but the full path/name is normally
easier to locate in Pimcore.

Do not use `image-thumb__...` paths as asset locations. Those identify generated renderings,
not the underlying asset.

## Next scan

When repeating the audit later:

1. Make sure the website cache is reasonably current.
2. Run `node .\scan-image-metadata.js <site-id>`.
3. Review the newly generated raw JSON.
4. Send the new `image-metadata.json` to ChatGPT for intelligent language cleanup.
5. Use the new `image-metadata-clean.md` as the correction list.
6. Keep any previous clean report only if you want a historical reference.

The raw scan should never overwrite a deliberately retained clean/reviewed file unless you
explicitly replace it.

## Relationship to the other audits

This image audit is supplementary.

- The normal language audit is page-oriented and detects language leakage in page content.
- The image metadata audit is asset-oriented and specifically covers image ALT/TITLE metadata.
- The SEO metadata toolchain is separate again and should not include image ALT/TITLE data.

All three may reuse the same downloaded HTML cache, but they serve different purposes.
