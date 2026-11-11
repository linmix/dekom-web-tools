const fs = require('fs');
const path = require('path');
const { VERSION, fingerprint } = require('./seoContentFingerprint');

function currentFingerprint(siteId, page) {
    if (!page) return null;
    if (page.contentFingerprint?.version === VERSION &&
        /^[a-f0-9]{64}$/.test(page.contentFingerprint.fingerprint || '')) return page.contentFingerprint;
    // Compatibility with scans generated before content fingerprints were added.
    if (!page.filename) return null;
    const file = path.join('SEO', siteId, 'pages', page.filename + '.json');
    if (!fs.existsSync(file)) return null;
    return fingerprint(JSON.parse(fs.readFileSync(file, 'utf8')).content);
}

function recordContentReview(siteId, page, now) {
    const current = currentFingerprint(siteId, page);
    if (!current) throw new Error(`No editorial content available for ${page.url}. Refresh the SEO scan before confirming a content review.`);
    return { reviewedAt: now, ...current };
}

function editorialStatus(record, current) {
    if (!current) return 'CONTENT UNAVAILABLE';
    if (!record.contentReview) return 'NOT YET ASSESSED';
    if (record.contentReview.version !== VERSION) return 'BASELINE OUTDATED';
    return current.fingerprint === record.contentReview.fingerprint ? 'CURRENT' : 'CONTENT CHANGED';
}

function auditContent({ siteId, leadingSite, state, currentPages, leadingIndex, groups, relativePath }) {
    const leader = siteId === leadingSite;
    const leaders = new Map(leadingIndex.map(p => [relativePath(p.url), p]));
    const groupByUrl = new Map(groups.flatMap(g => g.urls.map(url => [url, g])));
    // Leader-only pages are documented by the metadata parity report, not content warnings.
    const rows = Object.entries(state.pages)
        .filter(([url]) => leader || currentPages.has(relativePath(url)))
        .map(([url, record]) => {
        const p = relativePath(url);
        const page = currentPages.get(p);
        const current = currentFingerprint(siteId, page);
        let status;
        if (!page) status = 'PAGE MISSING';
        else if (leader) status = editorialStatus(record, current);
        else {
            const leading = currentFingerprint(leadingSite, leaders.get(p));
            status = !current || !leading ? 'CONTENT UNAVAILABLE'
                : current.fingerprint === leading.fingerprint ? 'MATCHES LEADER' : 'CONTENT DIFFERS FROM LEADER';
        }
        return { url, path: p, record, status, group: groupByUrl.get(url) };
    });
    const counts = {};
    for (const row of rows) counts[row.status] = (counts[row.status] || 0) + 1;
    const summary = [
        '## Editorial content status', '',
        ...Object.entries(counts).map(([status, count]) => `- ${status}: ${count}`), '',
        'Report: content-changes.md', ''
    ].join('\n');
    const lines = [
        `# SEO content review — ${siteId}`, '',
        leader ? 'Content is compared with the hash saved at the last explicit editorial review.'
            : `Content is compared with the current ${leadingSite} page. Regional differences need judgement; this comparison does not change leader decisions.`, '',
        'Whitespace, markup, layout, images, standalone CTAs and recognised shared service/contact blocks are excluded. Meaningful text changes are flagged conservatively; a hash cannot assess their editorial significance.', '',
        summary
    ];
    const flags = rows.filter(r => !['CURRENT', 'MATCHES LEADER'].includes(r.status));
    if (!flags.length) lines.push('No content review flags.', '');
    for (const row of flags) {
        lines.push(`## ${row.record.label || row.path}`, '',
            `Batch: ${row.group?.displayNumber || '00'} — ${row.group?.label || 'Unassigned'}`, '',
            `Path: \`${row.path}\``, '', `Status: **${row.status}**`, '',
            `Last content review: ${row.record.contentReview?.reviewedAt || 'none'}`, '',
            'Approved title:', '', row.record.title?.finalValue || '—', '',
            'Approved description:', '', row.record.description?.finalValue || '—', '');
    }
    return { rows, counts, summary, markdown: lines.join('\n') + '\n' };
}

module.exports = { currentFingerprint, recordContentReview, editorialStatus, auditContent };
