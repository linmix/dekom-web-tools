# SEO review page lifecycle

Updated: 19 October 2026.

## Install

Replace `modules/updateSeoReview.js` with the module in this archive.

## Behaviour

- A leader refresh removes a page's decision record if its path is absent from that leader's current `SEO/<leader>/index.json`.
- Applying editorial decisions also removes records absent from the current leader index.
- The entire page record is deleted, including title, description and previous review details. No retired-page archive is created.
- A renamed or replacement URL starts unreviewed. Previous decisions are not migrated to it automatically.
- Decisions for URLs still in the leader index are preserved.
- A missing follower page does not delete leader decisions. It remains a follower implementation/parity issue.
- The workflow logs the removed URLs, saves the leader state atomically and regenerates the derived reports. Old empty/unassigned batch reports are cleared during report regeneration.
- Repeating a refresh without further inventory changes makes no additional changes to the decision JSON.

The current SEO index defines which pages are in scope. This rule applies to disappearance from that inventory; it does not detect an overhaul that keeps the same URL.

## Run

After replacing the module, run your normal update in leader/follower order:

```powershell
node .\seo-scan.js nl-nl --refresh
node .\seo-scan.js nl-be --refresh
node .\seo-scan.js en-nl --refresh
node .\seo-scan.js en-gb --refresh
```

The old Avocor G-Series URL records should be removed by the leader refreshes. The newly approved Series One Board 65 decisions remain because their new URLs are in the current inventories.

## Validation

Syntax check and isolated workflow tests passed for leader pruning, preservation of live decisions, replacement URLs starting without inherited decisions, report regeneration, idempotence, follower isolation, applying decisions, rejection without writes for invalid payloads, and an empty index.
