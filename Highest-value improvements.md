# Highest-value remaining improvements

The DEKOM web-audit project is now sufficiently mature for routine use.

The main workflows are established:

- four consistent site IDs: `en-nl`, `en-gb`, `nl-nl`, and `nl-be`;
- standard and full-site language audits;
- download-coverage tracking;
- visible and hidden-content reporting;
- archived report history;
- comparison of current and previous audit results;
- site-structure comparison with deterministic aliases;
- URL snapshots;
- dictionary-based language detection;
- shared false-positive exceptions.

Further development should be conservative. New work should address a demonstrated reliability problem or provide a measurable workflow improvement rather than add architectural complexity.

---

## 1. Dictionary schema validation

### Problem

Dictionary errors can silently disable part of the language-detection system.

For example, if a scanner expects a property such as:

```text
stems
```

but the corresponding dictionary uses a different property name, the scanner may receive an empty array and continue normally.

The audit can therefore complete successfully while an entire detection mechanism is inactive.

### Proposed improvement

Add a small dictionary validator, for example:

```
modules/validateDictionaries.js
```

It should validate the operational Dutch and German dictionaries and the shared exception dictionary.

Expected structures include:

```
core:
  exact -> array
  stems -> array

connectors:
  exact -> array

prefixes:
  exact -> array
  stems -> array

suffixes:
  stems -> array

exceptions:
  uppercase_exact -> array
```

The validator should fail when:

- a required property is missing;
- a required property is not an array;
- a dictionary has a structure that prevents the scanner from using its rules correctly.

Where practical, it may also report duplicate entries.

The validator should be included in:

```
npm run check
```

so project validation covers both the expected directory structure and the operational dictionaries.

**Priority:** High

**Expected gain:** Prevents silent loss of language-detection rules.

---

## 2. Small deterministic regression tests

### Problem

Important processing logic is deterministic, but currently depends mainly on manual verification after code changes.

A regression in report archiving, report comparison, or site-structure normalization could produce plausible but incorrect output.

### Proposed improvement

Add a small set of tests using controlled local data.

A possible structure is:

```
tests/
├── archiveReport.test.js
├── compareReports.test.js
└── compareSiteStructure.test.js
```

The tests should focus on deterministic processing logic rather than network crawling.

### Report archiving

Verify that:

- an existing report is archived before replacement;
- the archive filename is based on the report generation timestamp;
- standard and full-site histories remain separate.

### Report comparison

Using small fixed reports, verify that:

- resolved findings are identified correctly;
- new findings are identified correctly;
- changed findings are identified correctly;
- visible and hidden findings remain distinct.

### Site-structure normalization

Verify that:

- known translated URL segments normalize to the same logical page;
- news URLs with the same numeric article ID normalize together;
- genuinely missing pages remain missing;
- overly broad aliases produce detectable collisions.

The crawler itself should not be included in these tests because external network behaviour would make the tests unnecessarily brittle.

**Priority:** Medium

**Expected gain:** Protects established behaviour when scripts are modified later.

---

## Improvements not currently justified

The following ideas have been considered but do not currently provide enough benefit to justify additional complexity.

### Full-sitemap site comparison

The current site-structure comparison uses each site's standard audit selection.

A future full-sitemap comparison could distinguish between pages that are genuinely absent from a site and pages that merely fall outside the configured audit scope.

There is no current workflow requirement for this.

### Known site-structure exceptions

Intentional differences between sites could be maintained in a separate configuration file.

This would become worthwhile only if the same intentional discrepancies repeatedly create unnecessary manual review work.

### Additional report canonicalization

Report comparison could further canonicalize ordering before generating signatures.

The current report generation is sufficiently deterministic for the present workflow.

### Shared report-generation timestamp

Visible and hidden reports could share one generation timestamp and additional provenance metadata.

This would make the relationship between the two files more explicit but does not currently solve a practical problem.

### More granular URL snapshots

Snapshots intentionally use one file per site, scope, and calendar day.

More granular timestamps are unnecessary for the current workflow.

### Further naming and structural refactoring

Some internal parameter and function names could be made more precise, but these changes would provide little functional benefit.

Refactoring should not be performed solely for naming consistency.

---

## Development principle

The project should remain deliberately small.

Do not add databases, dashboards, fuzzy matching, AI classification, additional abstraction layers, or major framework changes unless a concrete requirement demonstrates that the current architecture cannot handle the task reliably.

For future improvements, prefer this order:

1. identify a demonstrated failure mode or repeated manual problem;
2. make the smallest change that addresses it;
3. verify that existing workflows still work;
4. document the change;
5. avoid speculative refactoring.

At present, dictionary schema validation is the only remaining improvement that should be considered a significant reliability safeguard.

Deterministic regression tests provide useful secondary protection but are not required for routine operation.  
