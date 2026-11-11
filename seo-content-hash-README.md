# DEKOM SEO content hash review

## Install

Extract this archive into the DEKOM-web project root. Replace the existing `modules/extractSeo.js` and `modules/updateSeoReview.js`, and add the two new `modules/seoContentFingerprint.js` and `modules/seoContentReview.js` files. No new npm packages are required. This update includes the absent-page decision cleanup from the preceding lifecycle update.

Then run the normal refresh for nl-nl, nl-be, en-nl and en-gb, in that order. Existing scan data can be read as a fallback, but a fresh scan is preferred when reviewing actual content changes.

## What is stored

The current scan index contains a version and SHA-256 fingerprint. Each explicitly reviewed page decision record contains `contentReview` with the normalization version, fingerprint and reviewedAt date. No duplicate page text or content history is stored. The compact baseline is around 134 bytes before JSON indentation.

The existing extracted page JSON remains the source of the page content. The hash cannot reconstruct it or explain the differences from a previous version.

## What triggers a review

Headings, paragraphs and list text contribute to the hash, in reading order. Whitespace is collapsed, Unicode equivalent forms are normalized, soft hyphens/zero-width formatting characters are removed, and typographic quotation marks are standardized. Paragraph wrapping or splitting with identical text does not change the hash.

HTML attributes, CSS margins, image files, navigation, footer, standalone CTA links and recognised shared service/contact sections do not contribute. Main product lists do contribute because a portfolio change can affect SEO relevance. Shared service sections are identified by their known heading and introductory wording, to avoid ignoring a page's own services content.

This is conservative text-change detection, not an AI assessment of significance. A small wording, punctuation or number change can trigger review. A hash cannot safely distinguish a trivial correction from a one-word change that invalidates metadata. Formatting and whitespace changes alone do not trigger it. Hash comparison requires no extra website request or AI call.

## Reports

- `SEO/<site>/review/content-changes.md` lists content flags, the batch, page path and approved title/description.
- `decisions.md` has a separate Editorial content status summary.
- Each batch review report includes editorial content statuses.
- Implementation status (LIVE/PENDING/MISMATCH and follower MATCH/DIFFERS) remains independent.

Leader content statuses:

- CURRENT: current content matches the explicitly reviewed baseline.
- CONTENT CHANGED: content differs; assess SEO before renewing the baseline.
- NOT YET ASSESSED: an existing decision has no content baseline yet.
- BASELINE OUTDATED: normalization rules have changed; reassessment is required.
- CONTENT UNAVAILABLE: content could not be read; the baseline cannot be confirmed.

Follower content is compared with the current leader page, producing MATCHES LEADER or CONTENT DIFFERS FROM LEADER. This is a parity check, not independent editorial approval. Regional differences need judgement. Followers never renew leader baselines or alter their editorial decisions.

## When the baseline changes

A scan NEVER creates or renews the reviewed baseline. Existing decisions are NOT silently treated as having reviewed today's content.

Applying both a title decision and a description decision for a page through applySeoReview.js captures the current content fingerprint as part of that complete editorial review. For a metadata-only correction without affirming current content, add `"contentReviewed": false` to the page input.

After explicitly assessing a flagged page and confirming that its existing metadata remains suitable, use a content-only confirmation:

```powershell
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
@'
{
  "pages": [
    {
      "url": "https://www.dekom.com/nl-nl/REPLACE-WITH-REVIEWED-PAGE-PATH",
      "contentReviewed": true
    }
  ]
}
'@ | node .\modules\applySeoReview.js nl-nl --apply
```

Replace the example URL with the page actually reviewed. This retains its title/description decisions and renews only the content baseline. Both metadata decisions must already exist. Use the English leader for English pages. Never bulk-confirm unread pages just to clear the report.

If changing only one SEO component while reviewing the complete page, include `contentReviewed: true` explicitly. A single-component update alone does not renew the baseline.

## Validation

Syntax checks passed for all four modules. Isolated integration tests passed for formatting immunity, shared-section exclusion, FAQ and product-size changes, initial unassessed state, explicit baseline creation/renewal, persistence of flags across refreshes, follower content comparison, legacy scan fallback, unavailable content, and preservation of the retired-page cleanup behavior.
