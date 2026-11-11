const crypto = require('crypto');

// Increment this when the normalization rules change. Old baselines then need review.
const VERSION = 1;
const SHARED_HEADINGS = new Set([
    'onze diensten', 'our services', 'we offer 360° service',
    'heeft u een project? wij ondersteunen u graag.',
    'heeft u een project? we ondersteunen u graag.',
    'do you have a project? we are happy to assist you.',
    'do you have a project? we are happy to support you.'
]);

function normalize(text) {
    return String(text || '').normalize('NFKC')
        .replace(/[\u00ad\u200b\ufeff]/g, '')
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201c\u201d]/g, '"')
        .replace(/\s+/gu, ' ').trim();
}

function fingerprint(content) {
    if (!Array.isArray(content)) return null;
    const text = [];
    let excludedLevel = null;
    for (const [index, block] of content.entries()) {
        if (block.type === 'heading') {
            const level = Number(block.level) || 2;
            if (excludedLevel !== null && level <= excludedLevel) excludedLevel = null;
            const heading = normalize(block.text).toLowerCase();
            const serviceHeading = ['our services', 'onze diensten'].includes(heading);
            const following = content.slice(index + 1, index + 3).find(b => b.type === 'paragraph');
            const sharedServiceIntro = /^(from individual devices|van individuele apparaten)/i.test(normalize(following?.text));
            if (level > 1 && SHARED_HEADINGS.has(heading) && (!serviceHeading || sharedServiceIntro)) {
                excludedLevel = level;
            }
        }
        if (excludedLevel !== null || block.type === 'cta') continue;
        if (block.type === 'heading' || block.type === 'paragraph') {
            text.push(block.text || '');
        } else if (block.type === 'list') {
            for (const item of block.items || []) text.push(item.text || '');
        }
    }
    const normalized = normalize(text.join(' '));
    if (!normalized) return null;
    return { version: VERSION, fingerprint: crypto.createHash('sha256').update(normalized, 'utf8').digest('hex') };
}

module.exports = { VERSION, fingerprint, normalize };
