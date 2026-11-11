function list(value) {
    return Array.isArray(value) ? value : [];
}

function normalise(value) {
    return String(value || "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}

function matchEntries(matches) {
    if (!matches || typeof matches !== "object") {
        return [];
    }

    return [
        ...list(matches.core),
        ...list(matches.connectors),
        ...list(matches.prefixes),
        ...list(matches.suffixes)
    ];
}

function hiddenElementKey(item) {
    return [
        normalise(item.type),
        normalise(item.source),
        normalise(item.text)
    ].join("\u0000");
}

function hiddenPageStats(page) {
    const elements = list(page && page.matches);

    return {
        elementOccurrences: elements.length,
        ruleHits: elements.reduce(
            (total, item) => total + matchEntries(item.matches).length,
            0
        )
    };
}

function summariseHiddenReport(report) {
    const pages = list(report && report.pages);
    const uniqueElements = new Map();
    const byType = new Map();
    let elementOccurrences = 0;
    let ruleHits = 0;

    for (const page of pages) {
        for (const item of list(page.matches)) {
            elementOccurrences += 1;
            ruleHits += matchEntries(item.matches).length;

            const key = hiddenElementKey(item);
            let unique = uniqueElements.get(key);

            if (!unique) {
                unique = {
                    key,
                    type: item.type || "Unknown",
                    source: item.source || "",
                    text: item.text || "",
                    pageUrls: new Set(),
                    occurrences: 0
                };
                uniqueElements.set(key, unique);
            }

            unique.occurrences += 1;
            unique.pageUrls.add(page.url);

            const type = item.type || "Unknown";
            let typeStats = byType.get(type);

            if (!typeStats) {
                typeStats = {
                    type,
                    elementOccurrences: 0,
                    uniqueKeys: new Set()
                };
                byType.set(type, typeStats);
            }

            typeStats.elementOccurrences += 1;
            typeStats.uniqueKeys.add(key);
        }
    }

    return {
        pagesFlagged: pages.length,
        elementOccurrences,
        uniqueRemediationUnits: uniqueElements.size,
        ruleHits,
        byType: [...byType.values()]
            .map(item => ({
                type: item.type,
                elementOccurrences: item.elementOccurrences,
                uniqueRemediationUnits: item.uniqueKeys.size
            }))
            .sort((a, b) => b.elementOccurrences - a.elementOccurrences),
        reusedElements: [...uniqueElements.values()]
            .filter(item => item.occurrences > 1)
            .map(item => ({
                ...item,
                pageUrls: [...item.pageUrls].sort()
            }))
            .sort((a, b) => b.occurrences - a.occurrences)
    };
}

function summariseVisibleReport(report) {
    const pages = list(report && report.pages);

    return {
        pagesFlagged: pages.length,
        distinctMatchSignals: pages.reduce(
            (total, page) => total + matchEntries(page.matches).length,
            0
        )
    };
}

function summariseReports(visibleReport, hiddenReport) {
    return {
        visible: summariseVisibleReport(visibleReport),
        hidden: summariseHiddenReport(hiddenReport)
    };
}

module.exports = {
    hiddenPageStats,
    summariseHiddenReport,
    summariseReports
};
