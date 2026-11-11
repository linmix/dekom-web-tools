# DEKOM Web Cloud — Internal Link Analysis Handoff

## Recommended ChatGPT project

Continue this work in the **DEKOM Web Cloud** ChatGPT project.

### Why this project

DEKOM Web Cloud is the correct home because the proposed link-analysis functionality belongs to the local web-scraping and site-analysis toolchain.

The existing architecture is:

1. The local DEKOM Web Cloud project scrapes DEKOM websites.
2. Scraped pages are transformed into structured JSON and Markdown.
3. Local dictionary-based checks inspect the scraped content for language/content issues.
4. SEO functionality was later added on top of this existing scrape/transform infrastructure.
5. Relevant generated material is synchronized to Google Drive so AI-based SEO review can use the scraped page copy.
6. The new internal-link analysis should be another local analysis layer using the same scraped pages.

The **DEKOM SEO** ChatGPT project should remain focused on editorial SEO review and decisions. It can use link-analysis reports later when evaluating page relationships, cannibalisation, navigation, internal-link opportunities, or page discoverability.

---

# Project background

The local project is a website-analysis toolkit for DEKOM sites.

Current language/site structure:

- `en-nl` — authoritative English site
- `en-gb` — English follower
- `nl-nl` — authoritative Dutch site
- `nl-be` — Dutch follower

The project already contains logic for:

- fetching/scraping DEKOM pages;
- converting pages into structured JSON/Markdown;
- extracting text;
- running language dictionaries against page content;
- detecting German words on Dutch pages;
- detecting Dutch words on English pages;
- generating URL inventories and mappings;
- extracting SEO data;
- creating logical SEO page groups/batches;
- synchronizing selected generated content to Google Drive;
- allowing AI review of scraped page content and SEO metadata.

Important existing structural files include:

```text
cache/<site>/url-map.json
cache/<site>/urls-all.json
cache/<site>/urls-check.json
cache/<site>/urls-full.json
```

The local scrape also creates page/text material under:

```text
cache/<site>/pages/
cache/<site>/text/
```

These bulky working directories are normally excluded from the Google Drive mirror.

SEO outputs live under:

```text
SEO/<site>/
```

The existing SEO tooling is an add-on to the broader DEKOM Web Cloud project rather than the original purpose of the scraper.

---

# New functionality to build

Add an **internal-link analysis / site relationship module** to the existing DEKOM Web Cloud toolchain.

This should not be limited to detecting broken links.

The more valuable goal is to establish and analyse the actual relationship structure between DEKOM pages.

## Primary objectives

The tool should be able to answer questions such as:

- Which DEKOM pages link to a given page?
- Which internal pages does a page link to?
- Are there editorial pages with no meaningful incoming internal links?
- Are feature pages effectively orphaned from their logical vendor landing page?
- Do vendor landing pages expose all important child pages?
- Are links pointing to catalogue entries where a richer editorial/product feature page would be more appropriate?
- Are links pointing to outdated generations when a newer page exists?
- Are sibling pages connected logically?
- Are there pages that are technically present in the sitemap but difficult to discover through navigation?
- Do equivalent EN/NL or leader/follower sites have materially different internal-link structures?
- When a new feature page is created, which existing pages should link to it?
- When a page is replaced or repurposed, which incoming links need updating?

Broken-link checking is useful as an additional feature, but it is not the core purpose.

---

# Suggested data model

During or immediately after the existing page-fetch process, extract internal links from each fetched HTML page.

Create a generated file such as:

```text
cache/<site>/internal-links.json
```

Suggested conceptual structure:

```json
{
  "site": "en-nl",
  "generatedAt": "...",
  "pages": {
    "/products-partners/our-partners/logitech": {
      "url": "https://www.dekom.com/en-nl/...",
      "outgoing": [
        {
          "target": "/products-partners/...",
          "absoluteUrl": "https://www.dekom.com/en-nl/...",
          "anchorText": "Learn more",
          "context": "...",
          "sourceType": "content"
        }
      ],
      "incoming": []
    }
  }
}
```

The exact implementation can differ, but retain enough information to support later editorial analysis.

Useful per-link fields may include:

- source URL/path;
- target URL/path;
- resolved absolute target;
- anchor text;
- optional surrounding text/context;
- HTTP status where checked;
- whether target is internal/external;
- whether target redirects;
- final redirect destination;
- whether target exists in the known site URL inventory;
- link location/type if detectable:
  - body/editorial content;
  - CTA/button;
  - navigation;
  - footer;
  - breadcrumb;
  - catalogue/product component;
  - other repeated template area.

If template-level links create excessive noise, provide an option to exclude or separately classify global navigation/footer links.

---

# Derived reports

Generate human-readable and machine-readable summaries.

Possible outputs:

```text
reports/internal-links/<site>/link-graph.json
reports/internal-links/<site>/link-report.md
reports/internal-links/<site>/orphans.md
reports/internal-links/<site>/broken-links.md
```

A single consolidated report is also acceptable if cleaner.

Useful derived metrics:

- incoming internal link count;
- outgoing internal link count;
- unique linking pages;
- pages with zero contextual incoming links;
- pages with only one incoming contextual link;
- broken internal targets;
- redirects used as link targets;
- self-links;
- duplicate links;
- links to URLs not present in the current sitemap/inventory;
- pages linked only from footer/global navigation;
- pages linked only from another deep child page;
- potential parent/child relationship gaps.

---

# Relationship analysis

The tool should support higher-level site-architecture analysis rather than treating all links equally.

Examples of relationships worth identifying:

```text
Vendor landing page
    ↓
Vendor feature page
    ↓
Catalogue product entry
```

or:

```text
Vendor landing page
    ↓
Product-family page
    ↓
Individual catalogue products
```

or:

```text
Highlight / campaign page
    ↔
Relevant product feature page
    ↔
Catalogue entry
```

Where possible, expose data in a way that an AI review can later evaluate whether those relationships are logical.

Do not hardcode Logitech-specific rules into the generic link checker.

---

# Current use case motivating the feature

The Logitech page group exposed the need for this tooling.

Current known EN-NL editorial pages include:

```text
/products-partners/our-partners/logitech
/products-partners/our-partners/logitech/logitech-rally-bar-serie
/products-partners/our-partners/logitech/logitech-sight
/products-partners/our-partners/logitech/logitech-rally-board
/products-partners/our-partners/logitech/logitech-service-specialization
/products-partners/our-partners/logitech/logitech-for-the-individual-workplace
```

Important distinction:

**Page existence is not the same as page discoverability or actual internal linking.**

Examples already observed manually:

- the Logitech landing page links to the Rally Bar Series page;
- the Logitech landing page links to Rally Board 65;
- the Service Specialization page is reachable from the certification/service area on the Logitech landing page;
- Logitech Sight has a dedicated editorial page but is not directly exposed from the Logitech landing page;
- the Individual Workplace page exists but is effectively orphaned from the current Logitech landing-page content;
- Sight is linked contextually from other Logitech feature pages;
- current product compatibility must not be inferred from mere ecosystem/page relationships.

This is the kind of issue the new tool should make obvious automatically.

---

# Suggested implementation approach

Before coding, inspect the current scraper architecture and identify the cleanest integration point.

Likely workflow:

```text
fetch page
    ↓
store raw/transformed representation
    ↓
existing text/SEO extraction
    ↓
NEW: extract internal links
    ↓
resolve/canonicalise URLs
    ↓
aggregate source → target relationships
    ↓
invert graph to generate incoming links
    ↓
optional HTTP/link validation
    ↓
generate reports
```

Prefer reusing already-fetched HTML rather than issuing a second crawl solely for link extraction.

Canonicalisation should account for:

- relative vs absolute links;
- fragments (`#section`);
- trailing slashes;
- query parameters;
- language/site prefix;
- DEKOM internal host variants where relevant;
- redirects.

Do not silently collapse genuinely different pages.

---

# CLI design

Keep the command-line workflow consistent with the existing project.

Possible commands could eventually look like:

```powershell
node .\link-scan.js en-nl --existing
node .\link-scan.js en-nl --refresh
```

or the functionality could be integrated into the existing main scan command if that better matches the architecture.

Useful modes:

- `--existing`
  - analyse links from already-downloaded/current cached pages;
  - do not re-fetch the site.

- `--refresh`
  - use freshly downloaded pages / existing refresh pipeline.

Potential optional modes later:

```text
--broken
--orphans
--incoming <url>
--outgoing <url>
--group <path-prefix>
```

Do not commit to these flags before reviewing the current CLI conventions.

---

# Google Drive / AI integration

The core analysis should remain local and deterministic.

AI is not required to:

- scrape pages;
- extract links;
- resolve URL relationships;
- identify broken links;
- count incoming/outgoing links;
- generate graph data.

However, selected reports should be eligible for Google Drive synchronization so AI can later help with questions such as:

- Should this page be linked from its vendor landing page?
- Should this CTA link to a catalogue record or a richer feature page?
- Which related pages should cross-link?
- Does the internal-link architecture match the intended site hierarchy?
- Are new pages properly introduced into the existing content network?
- Are equivalent English and Dutch groups structured consistently?

Avoid syncing unnecessarily large raw link datasets if a smaller generated report is sufficient.

---

# Leader/follower comparison opportunity

A later extension could compare internal-link structures across:

```text
en-nl ↔ en-gb
nl-nl ↔ nl-be
```

This is conceptually different from SEO metadata parity.

Potential findings:

- child page exists on both sites but is only linked on one;
- CTA target differs across followers;
- one language links to an old page generation;
- vendor-page hierarchy differs;
- feature page is discoverable on leader but orphaned on follower.

Keep this as a later phase unless it falls out naturally from the initial data model.

---

# Relationship with Screaming Frog

Do not attempt to replace Screaming Frog comprehensively.

The DEKOM-specific tool is valuable because it can:

- reuse the project's existing scrape;
- work with DEKOM's own URL/page-group data;
- remain lightweight;
- produce project-specific reports;
- integrate with SEO page-group analysis;
- preserve history in the existing project;
- expose relationship data directly to AI via the Drive workflow.

Screaming Frog can remain useful for broad technical audits.

---

# Initial tasks for the new chat

1. Inspect the current DEKOM Web Cloud project structure in Google Drive.
2. Read the relevant README/runbook and scraper modules.
3. Identify:
   - where HTML is downloaded;
   - how page URLs map to cached files;
   - which parser/library is already used;
   - whether links are already extracted anywhere;
   - the cleanest integration point.
4. Propose the minimum viable architecture for internal-link extraction.
5. Define the JSON output schema.
6. Define a concise Markdown report.
7. Decide whether this belongs in:
   - the current scraper pipeline;
   - a new module called by the pipeline;
   - or a standalone command consuming existing cached pages.
8. Only then write or modify code.
9. Preserve existing SEO and dictionary workflows.
10. Do not introduce AI dependencies into the local scan itself.

---

# Desired first milestone

A successful first version should be able to run against `en-nl` and produce, for every scanned page:

- normalized URL/path;
- outgoing internal contextual links;
- incoming internal contextual links;
- incoming count;
- outgoing count.

It should also produce lists of:

- pages with zero contextual inbound links;
- pages with one contextual inbound link;
- broken internal links or targets missing from the known page inventory;
- redirecting internal links.

Then test it using the Logitech page group to verify that the generated relationship map matches the manually observed structure.

---

# Important constraints

- Do not conflate sitemap membership with internal-link discoverability.
- Do not infer product compatibility from page relationships.
- Keep scraping/link extraction deterministic and local.
- Reuse existing cached HTML wherever practical.
- Avoid duplicate network work.
- Preserve current project behaviour.
- Keep the generated output easy for both humans and AI to consume.
- Prefer modular additions over rewriting the established scraper.
- Use the existing DEKOM site configuration rather than hardcoding language-site mappings.

---

# Prompt to start the new chat

Use this as the opening request in the **DEKOM Web Cloud** project:

> I want to add an internal-link analysis module to the existing DEKOM Web Cloud scraper. Read the attached handoff first, then inspect the current project in Google Drive before proposing code changes. The main goal is not merely broken-link checking: I want to understand actual page relationships, discover orphaned or weakly linked pages, and later let AI evaluate whether links should point to catalogue entries, editorial product pages, vendor landing pages, or other related content. Start by mapping the existing scraper architecture and propose the smallest clean implementation that reuses already-fetched pages.
