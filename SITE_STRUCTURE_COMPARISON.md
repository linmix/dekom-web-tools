```

```

# Site Structure Comparison

The DEKOM site-structure comparison checks equivalent pages across:

- `en-nl`
- `en-gb`
- `nl-nl`
- `nl-be`

The comparison is deterministic. It does not use AI, machine translation, or fuzzy matching.

Equivalent pages are identified by converting their URL paths into a shared logical form.

---

## Running the comparison

Run:

```powershell
npm run compare-sites
```

or directly:

```powershell
node compare-sites.js
```

The console reports:

```
en-nl: ... URLs
en-gb: ... URLs
nl-nl: ... URLs
nl-be: ... URLs

Logical pages: ...
Complete across all sites: ...
Discrepancies: ...
Collisions: ...
```

Generated output is stored under:

```
output/site-structure/
```

The generated files are:

```
site-structure-discrepancies.md
site-structure-matrix.md
site-structure-comparison.json
```

These are generated files and can be recreated by rerunning the comparison.

---

## Comparison scope

The comparison reads:

```
cache/<site-id>/urls-check.json
```

for each site.

These files contain the URLs selected by the normal audit filters.

The comparison therefore compares the pages included in the standard DEKOM audit scope.

A page reported as missing from one site is not automatically proof that the page is absent from the website. It may also exist in the sitemap but fall outside that site's configured audit scope.

When reviewing a discrepancy, verify the affected page before treating it as a genuine structural difference.

---

## How equivalent pages are matched

The comparison uses:

- identical URL path segments where possible;
- stable numeric IDs for news pages;
- manually maintained Dutch-to-English URL segment aliases;
- optional full-path aliases for exceptional cases.

Alias configuration is stored in:

```
config/site-structure-aliases.json
```

Aliases should remain conservative.

A visible discrepancy is preferable to incorrectly matching two unrelated pages.

---

## Segment aliases

Most translated URL differences should be handled through:

```
segmentAliases
```

A segment alias converts a translated URL segment into the canonical segment used for comparison.

The format is:

```
{
  "segmentAliases": {
    "dutch-slug": "canonical-slug"
  }
}
```

The canonical form should normally be the English equivalent already used by the English sites.

For example:

```
{
  "segmentAliases": {
    "vacatures": "vacancies"
  }
}
```

This allows paths such as:

```
about-dekom/our-company/vacatures
```

and:

```
about-dekom/our-company/vacancies
```

to be treated as the same logical page.

---

## When to add a segment alias

After running:

```
npm run compare-sites
```

review:

```
output/site-structure/site-structure-discrepancies.md
```

A typical untranslated-alias problem appears as two logical rows where:

- the English sites appear in one row;
- the Dutch sites appear in another;
- manual inspection confirms that both rows represent the same page.

If the differing segment is a reusable translation, add it to `segmentAliases`.

Do not add an alias merely to reduce the discrepancy count.

---

## Path aliases

Use:

```
pathAliases
```

only when two equivalent pages have substantially different paths that cannot safely be normalized through a reusable segment translation.

A path alias is an exceptional mapping.

Prefer `segmentAliases` whenever the translation can safely apply to multiple URLs.

Do not use a path alias to force unrelated pages into the same logical page.

For example, a site-specific page such as:

```
contact/email-test-form
```

should remain a discrepancy if no genuine equivalent exists on the other sites.

---

## News pages

Ordinary news articles do not normally require aliases.

News URLs use the numeric CMS article ID as their logical identity.

For example:

```
/en-nl/news/4469/20260710-Projecting-Success
/nl-nl/news/4469/20260710-Projecting-Success
```

are normalized automatically to:

```
news/4469
```

The text following the numeric article ID may differ between sites without affecting the match.

If apparently equivalent news articles have different numeric IDs, the comparator treats them as different items.

Do not add an alias unless manual verification confirms that the different IDs genuinely represent the same article.

---

## Collisions

Always check the console value:

```
Collisions: 0
```

A collision means that two different URLs from the same site have normalized to the same logical key.

This may indicate that an alias is too broad.

If adding an alias changes the collision count from zero to a non-zero value, inspect the affected URLs before accepting the alias.

Collision details are included in:

```
output/site-structure/site-structure-discrepancies.md
```

Do not attempt to fix a collision by adding additional aliases until the cause of the collision has been identified.

---

## Validation after changing aliases

After every change to:

```
config/site-structure-aliases.json
```

rerun:

```
npm run compare-sites
```

Then check:

1. the expected discrepancy has disappeared;
2. the affected pages now form one logical row;
3. `Collisions` remains `0`;
4. no unrelated pages have been merged;
5. the remaining discrepancy report still makes sense.

A successful alias will normally reduce the number of logical pages and discrepancies while increasing the number of pages complete across all four sites.

For example, adding:

```
"vacatures": "vacancies"
```

previously changed:

```
Logical pages: 224
Complete across all sites: 210
Discrepancies: 14
Collisions: 0
```

to:

```
Logical pages: 223
Complete across all sites: 211
Discrepancies: 12
Collisions: 0
```

This is the expected pattern when two false discrepancy rows are correctly merged into one complete logical page.

---

## Recommended maintenance procedure

When the comparison reports a possible unmatched translation:

1. Verify the affected URLs.

2. Confirm that they represent the same logical page.

3. Identify which URL segment or path differs.

4. If it is a reusable translation, add a `segmentAliases` entry.

5. If it is a genuine one-off path difference, use `pathAliases`.

6. Run:
   
   ```
   npm run compare-sites
   ```

7. Confirm that the expected discrepancy disappeared.

8. Confirm that `Collisions` remains `0`.

9. Review the remaining discrepancies.

If the pages are genuinely different, leave the discrepancy in the report.

The objective is accurate comparison, not a zero-discrepancy report.  
