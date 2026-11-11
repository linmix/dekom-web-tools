# DEKOM SEO review roadmap — NL and EN

Snapshot: 29 September 2026, after the batch grouping fix and Dutch Pexip review.

## Scope and working rules

- Review editorial copy on `nl-nl` and `en-nl` only. Verify `nl-be` against `nl-nl` and `en-gb` against `en-nl` after publishing.
- Use `SEO/<leader>/batches/*.md` for the review, and record approved decisions through `applySeoReview.js`. The `finalValue` in each leader's `review/decisions.json` is authoritative; do not edit the decision files directly.
- Review related Dutch and English groups together, using natural copy for each language. A matching batch number does not imply identical page inventories.
- For each phase: review source pages, agree on current versus proposed title and description, record decisions, publish on leader and follower, refresh both, resolve `DIFFERS` and `PAGE MISSING`, then complete the indicated editorial consistency check.

## Verified starting point

| Site | Reviewed pages | LIVE components | Pending or mismatch | Follower comparison |
|---|---:|---:|---:|---|
| `nl-nl` | 94 | 188 | 0 | `nl-be`: 188 MATCH, 0 DIFFERS, 0 PAGE MISSING |
| `en-nl` | 85 | 170 | 0 | `en-gb`: 170 MATCH, 0 DIFFERS, 0 PAGE MISSING |

The follower reports also list three pages present only on `nl-nl` and six present only on `en-nl`. They are structural parity observations, not reviewed metadata mismatches; investigate them separately if a corresponding regional page is expected.

Completed editorial groups: 01–11, 13, 15, 16, and 22–24 in both leaders; 20 is complete in Dutch only. English 08 and Dutch 08 are complete. Batch 21 is open in both languages.

## Priority 1 — Finish the core product taxonomy

| Order | Batch | Group | Pages NL / EN | Review focus |
|---:|---:|---|---:|---|
| 1 | 12 | Display solutions / displayoplossingen | 5 / 5 | Separate displays, video walls, interactive whiteboards and individual workstations from the category overview and already reviewed media technology pages. |
| 2 | 14 | Cameras and video bars | 5 / 5 | Separate camera, webcam, visualizer and video bar intent from the reviewed videoconferencing overview and room system pages. |

**Checkpoint A:** Compare 12 and 14 with reviewed 13, 15 and 16, plus room and platform pages 03–09. Check near-duplicate titles, generic descriptions, inconsistent product terminology, and claims that belong to a different page. Run the leader/follower comparison after publication.

## Priority 2 — Named strategic partners

| Order | Batch | Group | Pages NL / EN | Review focus |
|---:|---:|---|---:|---|
| 3 | 17 | Logitech | 6 / 6 | Portfolio and product pages; keep room system, video bar and individual workplace intent distinct. |
| 4 | 18 | Neat | 5 / 5 | Verify named products and the relationship between overview and individual devices. |
| 5 | 19 | HP Poly, Q-SYS, Shure and Yealink | 7 / 7 | Give each vendor its own role; avoid interchangeable descriptions or outdated product/certification claims. |
| 6 | 32 | Barco | 4 / 4 | Review as a named vendor before the alphabetic bulk groups, including its relationship to wireless presentation and display solutions. |

**Checkpoint B:** Compare partner pages with platform batches 03–08 and product batches 12–16. Look for copied product lists, incorrect certifications, vendor claims, and repetitive openings. Verify followers.

## Priority 3 — Company, proof and contact routes

| Order | Batch | Group | Pages NL / EN | Review focus |
|---:|---:|---:|---|
| 7 | 20 | About DEKOM | NL reviewed / EN 9 | Review the English company, location, certification, vacancy and campaign pages; compare the equivalent Dutch decisions where relevant. |
| 8 | 21 | References and case studies | 10 / 11 | Start with the hub, then individual cases. Describe the actual client outcome and technology without interchangeable case-study snippets. English has one extra case page. |
| 9 | 30 | Contact | 10 / 9 | Prioritize the real advice/contact routes; screen test forms, campaign forms and utility pages for indexing intent before drafting metadata. |

**Checkpoint C:** Compare 20–24, the reference hub and the contact routes. Check DEKOM positioning, service terminology, regional claims, repeated calls to action, and similar company descriptions. Verify followers and inspect leader-only paths.

## Priority 4 — Current editorial pages

| Order | Batch | Group | Pages NL / EN | Review focus |
|---:|---:|---|---:|---|
| 10 | 25 | News overview | 1 / 1 | Distinct hub title and description. |
| 11 | 28 | News 2026 | 10 / 12 | Prioritize evergreen or strategically useful articles; use accurate event and publication context. |
| 12 | 29 | Events | 6 / 6 | Screen expired event pages and avoid promoting past registration opportunities. |

**Checkpoint D:** Compare news/event metadata with current product and partner pages. Avoid stale event language or repeating the same promotional summary across an article and its topic page. Verify followers.

## Priority 5 — Broad partner catalogue

| Order | Batch | Group | Pages NL / EN | Review focus |
|---:|---:|---|---:|---|
| 13 | 33 | Absen–Avocor | 8 / 8 | Distinct vendor and product role. |
| 14 | 34 | Axeos–DTEN | 8 / 8 | Same. |
| 15 | 35 | Epson–i3CONNECT | 8 / 8 | Same. |
| 16 | 36 | INFiLED–Nureva | 8 / 8 | Same. |
| 17 | 37 | Later alphabetic partners | 8 / 8 | NL ends at SynergySky; EN ends at Spaceti. Match pages by vendor/path, not ordinal position. |
| 18 | 38 | Final alphabetic partners | 4 / 5 | NL starts at T1V; EN starts at SynergySky. Match pages by vendor/path. |

**Checkpoint E:** After every two bulk batches, compare titles and descriptions within the partner directory and against named partners 17–19 and 32. Check repeated templates, distinguishing attributes and current factual claims. Finish with a full partner directory pass and follower verification.

## Priority 6 — Historical and utility pages

| Order | Batch | Group | Pages NL / EN | Review focus |
|---:|---:|---|---:|---|
| 19 | 27 | News 2025 | 7 / 7 | Review selectively, starting with pages that remain relevant. |
| 20 | 26 | News 2024 | 10 / 7 | Review selectively; older announcements may need maintenance or indexing decisions before metadata work. |
| 21 | 31 | Legal | 2 / 1 | Check whether each page should be indexed and has accurate, jurisdiction-specific wording. Route legal text changes through the appropriate owner. |

## Final cross-site editorial audit

1. Compare all reviewed leader titles and descriptions within each language for exact and near duplicates, repeated openings (including “Explore” / “Ontdek”), boilerplate, and competing page intent.
2. Compare corresponding NL and EN page purposes and factual claims without forcing literal translation.
3. Check title length and CMS-added `· DEKOM`, description length and truncation, and title/description alignment with on-page content. Length ranges are editing targets, not hard search-engine limits.
4. Refresh all four sites and confirm no `PENDING`, `MISMATCH`, `DIFFERS` or `PAGE MISSING` components. Reinspect the structural leader-only paths independently.

This order is editorial priority, not the generated batch number. Batch numbers remain stable for locating source files; the plan groups related work so each consistency check has enough coverage to be useful.
