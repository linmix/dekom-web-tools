'use strict';
// Offline observations only. Never changes cache, CMS, or editorial decisions.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cheerio = require('cheerio');
const VERSION = 'dekom-catalogue-2.0.1';
const HTML_PARSER_VERSION = 'dekom-catalogue-html-2.0.1';
const reports = require('./catalogueReports');
const LOCALES = ['nl-nl', 'nl-be', 'en-nl', 'en-gb'];
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const readJSON = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const writeJSON = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', 'utf8');
function atomicJSON(file, value) {
    const tmp = file + '.' + crypto.randomBytes(6).toString('hex') + '.tmp';
    writeJSON(tmp, value);
    fs.renameSync(tmp, file);
}
function candidate(url, locale) {
    try {
        const u = new URL(url), p = u.pathname.split('/').filter(Boolean);
        return u.hostname === 'www.dekom.com' && p.length === 4 && p[0] === locale && /^[A-Z]/.test(p[1]);
    } catch { return false; }
}
function absolute(href, base) { try { return new URL(href, base).href; } catch { return null; } }
const sitemapNamespace = url => /^https?:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9\/?$/.test(url);
const displayed = s => s.replace(/\s+/gu, ' ').trim();
function parsePage(raw, url, locale) {
    const $ = cheerio.load(raw.toString('utf8'));
    const issues = [], warnings = [], cards = [], findings = [], excludedTiles = [];
    const scripts = $('script:not([src])').map((i, e) => $(e).text()).get().join('\n');
    const ids = [...scripts.matchAll(/function\s+startInquiry\s*\(\s*\)\s*\{[\s\S]*?a\.includes\((\d+)\)/g)].map(m => m[1]);
    $('h3.item__title').each((i, e) => {
        const box = $(e).parent().parent();
        const buttons = [...new Set(box.find('[data-item-id]').map((j, b) => $(b).attr('data-item-id')).get())];
        const hrefs = [...new Set(box.find('a[href]').map((j, a) => absolute($(a).attr('href'), url)).get().filter(Boolean))];
        const outer = $(e).closest('.teaser-columns-slider__item');
        const alphabeticAnchor = outer.children('a[id]:not([href])').attr('id');
        const logoEvidence=outer.find('img').toArray().some(img=>/\/manufacturers\//.test($(img).attr('src')||'') &&
            /logo/i.test([$(img).attr('src'),$(img).attr('alt'),$(img).attr('title')].join(' ')));
        if (!buttons.length && !hrefs.length && !box.find('li').length && (/^[a-z]$/i.test(alphabeticAnchor || '') || logoEvidence)) {
            if(!/^[a-z]$/i.test(alphabeticAnchor||'')) warnings.push({kind:'manufacturer-index-anchor-review',display_name:$(e).text(),anchor:alphabeticAnchor||null});
            excludedTiles.push({occurrence: i + 1, display_name: $(e).text(), kind: logoEvidence?'manufacturer-logo-index-tile':'alphabetical-index-tile', anchor: alphabeticAnchor, logo_evidence: logoEvidence});
            return;
        }
        if (buttons.length !== 1 || hrefs.length > 1) {
            issues.push({kind: 'card-template', occurrence: i + 1, ids: buttons, links: hrefs});
            return;
        }
        if (!hrefs.length || !displayed($(e).text())) {
            findings.push({kind: 'incomplete-product-card', occurrence: i + 1, catalogue_id: buttons[0],
                display_name: $(e).text(), target_url: hrefs[0] || null, missing_name: !displayed($(e).text()), missing_link: !hrefs.length});
        }
        cards.push({catalogue_id: buttons[0], target_url: hrefs[0] || null, display_name: $(e).text(),
            bullets: box.find('ul li').map((j, b) => $(b).text()).get(),
            descriptions: box.find('p').map((j, b) => $(b).text()).get(), occurrence: i + 1});
    });
    // Detect unrecognised card headings rather than silently losing their content.
    const otherCards = $('[data-item-id]').filter((i, e) => !$(e).closest('.teaser-columns-slider__content').length);
    if (otherCards.length) warnings.push({kind: 'other-watchlist-controls', count: otherCards.length});
    let product = null;
    const isCandidate = candidate(url, locale);
    if (isCandidate || ids.length) {
        const h = $('h1');
        if (h.length !== 1 || ids.length !== 1) {
            issues.push({kind: 'product-template', h1_count: h.length, main_ids: ids});
        } else {
            const intro = h.parent(), allLists=intro.children('ul'), styledLists=allLists.filter('.list--icon');
            const lists=styledLists.length?styledLists:allLists;
            const additionalLists=allLists.filter((i,e)=>!lists.toArray().includes(e)).map((i,e)=>({class_name:$(e).attr('class')||'',items:$(e).children('li').map((j,li)=>$(li).text()).get(),raw_text:$(e).text()})).get();
            if(additionalLists.length)findings.push({kind:'additional-introductory-list',catalogue_id:ids[0],lists:additionalLists,
                reason:'The explicitly styled USP block is captured separately; other introductory lists, including empty markup, are retained for review.'});
            const description = intro.children('p').map((i, e) => $(e).text()).get();
            const bullets = lists.children('li').map((i, e) => $(e).text()).get();
            if (lists.length > 1) issues.push({kind: 'ambiguous-intro-template', list_count: lists.length});
            if (!description.some(displayed) || ![3, 4].includes(bullets.length)) {
                findings.push({kind: 'intro-content-review', catalogue_id: ids[0], description_count: description.length,
                    list_count: lists.length, usp_count: bullets.length,
                    missing_short_description: !description.some(displayed), unexpected_usp_count: ![3, 4].includes(bullets.length)});
            }
            if (!isCandidate) issues.push({kind: 'product-outside-route-rule'});
            const localeLinks = {};
            $('link[rel="alternate"]').each((i, e) => {
                const lang = $(e).attr('hreflang');
                if (LOCALES.includes(lang)) localeLinks[lang] = absolute($(e).attr('href'), url);
            });
            // Preserve prose for paired-language comparison, excluding navigation, cards and technical tables.
            const sections = [];
            const descriptionBlocks = $('details').filter((i,e) => /^(productbeschrijving|product description)$/i.test(displayed($(e).children('summary').text())));
            if (descriptionBlocks.length !== 1) warnings.push({kind: 'description-section-count', count: descriptionBlocks.length});
            descriptionBlocks.find('.collapsible__content').find('p,h2,h3,h4,h5,ul,ol').each((i, e) => {
                const el = $(e);
                const value = el.text();
                if (displayed(value)) sections.push({tag: e.tagName, text: value});
            });
            const evidence = JSON.stringify(sections);
            // Full prose remains available locally/live; explicitly signal bounded evidence.
            const bounded = []; let chars = 0;
            for (const section of sections) { if (chars + section.text.length > 24000) break; bounded.push(section); chars += section.text.length; }
            const logos = $('img[src*="/manufacturers/"]').map((i,e) => ({alt: $(e).attr('alt') || '', src: $(e).attr('src')})).get();
            product = {catalogue_id: ids[0], locale, url, display_name: h.text(), short_description: description,
                bullets, introductory_lists: additionalLists, displayed_bullets: bullets.map(displayed), category_label: intro.children('h6').text() || null,
                locale_links: localeLinks, canonical: $('link[rel="canonical"]').map((i,e) => $(e).attr('href')).get(),
                manufacturer_logo_observations: logos.slice(0, 1),
                descriptive_evidence: bounded, descriptive_evidence_truncated: bounded.length !== sections.length,
                descriptive_evidence_sha256: digest(evidence), identity_basis: 'Main startInquiry ID; SKU/generation/package contents not inferred'};
        }
    }
    return {product, cards, issues, warnings, findings, excludedTiles};
}
function collectCatalogue(locale, options = {}) {
    if (!LOCALES.includes(locale)) throw new Error('Unsupported catalogue locale: ' + locale);
    const root = path.resolve(options.root || path.join(__dirname, '..'));
    const cache = path.join(root, 'cache', locale);
    const mapFile = path.join(cache, 'url-map.json');
    const selectedFile = path.join(cache, 'urls-full.json');
    const mapBytes = fs.readFileSync(mapFile), selectedBytes = fs.readFileSync(selectedFile);
    const urlMap = readJSON(mapFile), selected = readJSON(selectedFile);
    if (!Array.isArray(selected) || !selected.length || selected.some(u => typeof u !== 'string')) throw new Error('urls-full.json must be a non-empty URL array.');
    const entries = Object.entries(urlMap);
    if (!entries.length || entries.some(([hash,url]) => !/^[a-f0-9]{32}$/.test(hash) || typeof url !== 'string')) throw new Error('Invalid hash-to-URL map.');
    const receiptFile = path.join(cache, 'download-receipt.json');
    const receipt = fs.existsSync(receiptFile) ? readJSON(receiptFile) : null;
    if (receipt && (receipt.completed !== true || receipt.scope !== 'full' || receipt.locale !== locale || receipt.selected_urls_sha256 !== digest(JSON.stringify(selected)))) {
        throw new Error('The current cache is not from the matching full scan. No export published.');
    }
    const currentURLs = new Set(entries.map(e => e[1])), expected = new Set(selected);
    const extra = [...currentURLs].filter(u => !expected.has(u));
    if (extra.length) throw new Error('Current map contains URLs outside urls-full.json; cache may have been replaced by a filtered scan.');
    const stage = path.join(root, 'catalogue', '.staging', locale);
    fs.mkdirSync(stage, {recursive: true});
    const lock = path.join(stage, 'export.lock');
    if (fs.existsSync(lock)) {
        const prior = readJSON(lock);
        try { process.kill(prior.pid, 0); throw new Error('An exporter is already running (PID ' + prior.pid + ').'); }
        catch (e) { if (e.code !== 'ESRCH') throw e; fs.unlinkSync(lock); }
    }
    fs.writeFileSync(lock, JSON.stringify({pid: process.pid}), {flag: 'wx'});
    try {
        const runId = new Date().toISOString().replace(/[-:.]/g, '') + '-' + crypto.randomBytes(4).toString('hex');
        const products = [], issues = [], warnings = [], findings = [], excludedTiles = [], content = {}, placements = [], ids = new Map();
        const receipts = new Map((receipt?.pages || []).map(r => [r.url, r]));
        let reused = 0, read = 0, rawBytes = 0;
        const missing = [...expected].filter(u => !currentURLs.has(u));
        const exclusionFile = path.join(root, 'catalogue', 'export-scope-exclusions.json');
        const configuredExclusions = fs.existsSync(exclusionFile) ? readJSON(exclusionFile).exclusions : [];
        if (!Array.isArray(configuredExclusions)) throw new Error('Invalid scope exclusion configuration.');
        const exclusions = [], unresolvedMissing = [];
        for (const url of missing) {
            let evidence = !receipt && !candidate(url, locale) && configuredExclusions.find(e => e.url === url &&
                e.url_map_sha256 === digest(mapBytes) && e.selected_urls_file_sha256 === digest(selectedBytes) &&
                e.observed_http_status === 404 && e.observed_at && e.reason);
            const failure = receipts.get(url);
            if (!evidence && new URL(url).pathname === '/' + locale + '/documents' && failure?.status === 404) {
                evidence = {url, observed_http_status:404, evidence_basis:'Matching full-download receipt',
                    reason:'The non-catalogue documents endpoint returned HTTP 404. Explicitly outside catalogue/card page scope; product 404s are never excluded by this rule.'};
            }
            if(!evidence && sitemapNamespace(url))evidence={url,reason:'Sitemap XML namespace URI incorrectly selected by the previous regex loader; not a content page.',evidence_basis:'Exact sitemap namespace URI'};
            if (evidence) exclusions.push(evidence);
            else { unresolvedMissing.push(url); issues.push({url, kind: 'not-downloaded', catalogue_candidate: candidate(url, locale)}); }
        }
        let excludedMapped=0;
        for (const [hash, url] of entries) {
            if(sitemapNamespace(url)){
                exclusions.push({url,reason:'Sitemap XML namespace URI incorrectly selected by the previous regex loader; not a content page.',evidence_basis:'Exact sitemap namespace URI'});
                excludedMapped++;continue;
            }
            try {
                const raw = fs.readFileSync(path.join(cache, 'pages', hash + '.html'));
                rawBytes += raw.length;
                const htmlHash = digest(raw), checkpoint = path.join(stage, hash + '.json');
                let parsed;
                try { const old = readJSON(checkpoint); if (old.version === HTML_PARSER_VERSION && old.html_sha256 === htmlHash && old.url === url) {parsed = old.parsed; reused++;} } catch {}
                if (!parsed) { parsed = parsePage(raw, url, locale); atomicJSON(checkpoint, {version: HTML_PARSER_VERSION, html_sha256: htmlHash, url, parsed}); }
                const transport = receipts.get(url);
                if (transport && (transport.status !== 200 || (transport.final_url && new URL(transport.final_url).pathname !== new URL(url).pathname) || (transport.html_sha256 && transport.html_sha256 !== htmlHash) || (transport.final_url && (new URL(transport.final_url).hostname !== 'www.dekom.com' || new URL(transport.final_url).pathname.split('/').filter(Boolean)[0] !== locale)))) {
                    issues.push({url, kind: 'transport-or-source-mismatch', transport});
                }
                const provenance = {source_hash: hash, html_sha256: htmlHash, fetched_at: transport?.fetched_at || null,
                    http_status: transport?.status ?? null, final_url: transport?.final_url || null};
                if (parsed.product) {
                    const p = {...parsed.product, ...provenance};
                    if (ids.has(p.catalogue_id)) issues.push({url, kind: 'duplicate-main-id', catalogue_id: p.catalogue_id, other_url: ids.get(p.catalogue_id)});
                    ids.set(p.catalogue_id, url); products.push(p);
                }
                for (const card of parsed.cards) {
                    const {occurrence, ...value} = card, key = digest(JSON.stringify(value));
                    content[key] = value;
                    placements.push({source_url: url, source_hash: hash, html_sha256: htmlHash, occurrence, content_id: key});
                }
                issues.push(...parsed.issues.map(e => ({url, ...e})));
                warnings.push(...parsed.warnings.map(e => ({url, ...e})));
                findings.push(...parsed.findings.map(e => ({url, ...e})));
                excludedTiles.push(...parsed.excludedTiles.map(e => ({url, ...e})));
                read++;
            } catch (e) { issues.push({url, source_hash: hash, kind: 'read-or-parse-failed', message: e.message}); }
            if ((read % 50) === 0) console.log(`${locale}: ${read}/${entries.length} pages processed`);
        }
        if (digest(fs.readFileSync(mapFile)) !== digest(mapBytes) || digest(fs.readFileSync(selectedFile)) !== digest(selectedBytes)) throw new Error('Cache inventory changed during export; no snapshot published.');
        // Preserve unresolved card targets without guessing identity or publication status.
        for (const value of Object.values(content)) {
            if (!ids.has(value.catalogue_id)) findings.push({kind: 'card-id-absent-from-locale-inventory',
                catalogue_id: value.catalogue_id, display_name: value.display_name, target_url: value.target_url});
        }
        // Legacy HTML is usable, but unknown transport evidence remains explicitly unknown.
        const productIssues = issues.filter(e => e.kind !== 'card-template' && (e.kind === 'read-or-parse-failed' || e.catalogue_candidate || candidate(e.url, locale) || e.kind === 'product-outside-route-rule'));
        const manifest = {schema_version: 2, parser_version: HTML_PARSER_VERSION, exporter_version: VERSION, run_id: runId, locale,
            exported_at: new Date().toISOString(), source_scope: 'full',
            source_scope_evidence: receipt ? 'matching download receipt' : 'urls-full/map reconciliation; legacy cache, transport unknown',
            url_map_sha256: digest(mapBytes), selected_urls_file_sha256: digest(selectedBytes),
            expected_pages: expected.size, mapped_pages: entries.length, read_pages: read, mapped_non_content_exclusions:excludedMapped,
            expected_catalogue_candidates: [...expected].filter(u => candidate(u, locale)).length,
            product_records: products.length, distinct_catalogue_ids: ids.size,
            card_placements: placements.length, unique_card_contents: Object.keys(content).length,
            product_records_complete: productIssues.length === 0 && products.length > 0,
            card_placement_coverage_complete: unresolvedMissing.length === 0 && read + excludedMapped === entries.length && !issues.length,
            complete: !issues.length && products.length > 0,
            coverage_limit: 'Declared catalogue/card scope reconciled against sitemap and main IDs. Documented scope exclusions are not historical HTML observations. Completeness does not prove CMS-wide discovery or universal card-template support.',
            content_findings_count: findings.length, scope_exclusions: exclusions,
            excluded_non_catalogue_tiles: excludedTiles,
            unknown_transport_pages: products.filter(p => p.http_status === null).length,
            raw_html_bytes: rawBytes, reused_pages: reused, issues, warnings};
        if (!receipt) manifest.warnings.push({kind: 'legacy-cache', message: 'Fetch times, HTTP status and redirect destinations unknown. Stale raw-cache content cannot be disproved without receipts.'});
        reports.publishData(root,{schema_version:2,manifest,products,cards:{contents:content,placements},findings,pending_changes:[]});
        // Keep one resumable checkpoint per current mapped HTML file, not a scan history.
        for (const name of fs.readdirSync(stage)) {
            if (/^[a-f0-9]{32}\.json$/.test(name) && !Object.hasOwn(urlMap,name.slice(0,-5))) fs.unlinkSync(path.join(stage,name));
        }
        console.log(`${locale}: ${products.length} products; ${placements.length} card placements; ${issues.length} extraction exceptions; ${findings.length} content findings; ${exclusions.length} documented scope exclusions; ${reused} reused pages.`);
        console.log('Report: ' + path.join(root,'catalogue','exports',locale,manifest.complete?'REPORT.md':'FAILURE.md'));
        console.log(manifest.complete ? 'COMPLETE: current data/report replaced; superseded catalogue snapshots removed.' : 'INCOMPLETE: current failure report saved; previous complete data retained.');
        return manifest;
    } finally { fs.unlinkSync(lock); }
}
function exportCatalogue(locale, options = {}) {
    if (!LOCALES.includes(locale)) throw new Error('Unsupported catalogue locale: ' + locale);
    const root = path.resolve(options.root || path.join(__dirname, '..'));
    try {
        reports.migrateLegacy(root);
        return collectCatalogue(locale, options);
    } catch (error) {
        console.error('Catalogue export failed: ' + error.message);
        return reports.recordFailure(root,locale,error);
    }
}
module.exports = {exportCatalogue, parsePage, candidate, VERSION};
