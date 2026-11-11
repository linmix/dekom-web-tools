const fs = require("fs");
const path = require("path");

const {
    hiddenPageStats,
    summariseReports
} = require("./reportStats");


function loadJson(file) {
    return JSON.parse(
        fs.readFileSync(file, "utf8")
    );
}


function pageMap(report) {
    return new Map(
        (report.pages || []).map(
            page => [page.url, page]
        )
    );
}


function signature(value) {
    return JSON.stringify(value || {});
}


function getLatestArchive(
    reportFolder,
    reportFilename
) {
    const archiveFolder = path.join(
        reportFolder,
        "archive"
    );

    if (!fs.existsSync(archiveFolder)) {
        return null;
    }

    const files = fs.readdirSync(archiveFolder)
        .filter(
            file =>
                file.endsWith(
                    `-${reportFilename}`
                )
        )
        .sort()
        .reverse();

    if (!files.length) {
        return null;
    }

    return path.join(
        archiveFolder,
        files[0]
    );
}


function visibleMatchCount(matches) {
    if (
        !matches ||
        typeof matches !== "object"
    ) {
        return 0;
    }

    return [
        matches.core,
        matches.connectors,
        matches.prefixes,
        matches.suffixes
    ].reduce(
        (total, items) =>
            total +
            (
                Array.isArray(items)
                    ? items.length
                    : 0
            ),
        0
    );
}


function formatMetric(before, after) {
    const difference =
        after - before;

    if (difference === 0) {
        return `${before} -> ${after} (0)`;
    }

    const sign =
        difference > 0
            ? "+"
            : "";

    return (
        `${before} -> ${after} ` +
        `(${sign}${difference})`
    );
}


function reportDate(date) {
    const day =
        String(date.getDate())
            .padStart(2, "0");

    const month =
        String(date.getMonth() + 1)
            .padStart(2, "0");

    const year =
        date.getFullYear();

    return `${day}-${month}-${year}`;
}


function reportFilenameTimestamp(date) {
    return date
        .toISOString()
        .replace(/\.\d{3}Z$/, "")
        .replace("T", "-")
        .replace(/:/g, "-");
}


function addSection(
    lines,
    heading,
    items,
    formatter
) {
    if (!items.length) {
        return;
    }

    lines.push("");
    lines.push(heading);
    lines.push(
        "-".repeat(heading.length)
    );
    lines.push("");

    for (const item of items) {
        lines.push(item.url);

        if (formatter) {
            const detail =
                formatter(item);

            if (detail) {
                lines.push(detail);
            }
        }

        lines.push("");
    }
}


function writeChangeReport(
    config,
    changes,
    previousVisible,
    currentVisible,
    previousHidden,
    currentHidden
) {
    const previous =
        summariseReports(
            previousVisible,
            previousHidden
        );

    const current =
        summariseReports(
            currentVisible,
            currentHidden
        );

    const now =
        new Date();

    const languageLabel =
        config.languageLabel ||
        "Language";

    const languageUpper =
        languageLabel.toUpperCase();


    const lines = [
        `${languageLabel} Language Audit Report - ${reportDate(now)}`,
        "===========================",
        "",
        "Visible pages flagged: " +
            formatMetric(
                previous.visible.pagesFlagged,
                current.visible.pagesFlagged
            ),
        "Visible distinct match signals: " +
            formatMetric(
                previous.visible.distinctMatchSignals,
                current.visible.distinctMatchSignals
            ),
        "",
        "Hidden pages flagged: " +
            formatMetric(
                previous.hidden.pagesFlagged,
                current.hidden.pagesFlagged
            ),
        "Hidden element occurrences: " +
            formatMetric(
                previous.hidden.elementOccurrences,
                current.hidden.elementOccurrences
            ),
        "Unique hidden remediation units: " +
            formatMetric(
                previous.hidden.uniqueRemediationUnits,
                current.hidden.uniqueRemediationUnits
            ),
        "Hidden language-rule hits: " +
            formatMetric(
                previous.hidden.ruleHits,
                current.hidden.ruleHits
            ),
        "",
        "Changes",
        "=======",
        "",
        `Resolved visible pages: ${changes.resolvedVisible.length}`,
        `Resolved hidden pages: ${changes.resolvedHidden.length}`,
        `New visible pages: ${changes.newVisible.length}`,
        `New hidden pages: ${changes.newHidden.length}`,
        `Changed visible pages: ${changes.changedVisible.length}`,
        `Changed hidden pages: ${changes.changedHidden.length}`,
        "",
        "DETAILS",
        "======="
    ];


    addSection(
        lines,
        `VISIBLE ${languageUpper} REMOVED`,
        changes.resolvedVisible,
        item => {
            const before =
                visibleMatchCount(
                    item.before
                );

            return (
                "Visible match signals: " +
                formatMetric(
                    before,
                    0
                )
            );
        }
    );


    addSection(
        lines,
        `HIDDEN ${languageUpper} REMOVED`,
        changes.resolvedHidden,
        item => {
            return (
                "Hidden element occurrences: " +
                formatMetric(
                    item.beforeElements,
                    0
                )
            );
        }
    );


    addSection(
        lines,
        `NEW VISIBLE ${languageUpper} DETECTED`,
        changes.newVisible,
        item => {
            const after =
                visibleMatchCount(
                    item.after
                );

            return (
                "Visible match signals: " +
                formatMetric(
                    0,
                    after
                )
            );
        }
    );


    addSection(
        lines,
        `NEW HIDDEN ${languageUpper} DETECTED`,
        changes.newHidden,
        item => {
            return (
                "Hidden element occurrences: " +
                formatMetric(
                    0,
                    item.afterElements
                )
            );
        }
    );


    addSection(
        lines,
        "VISIBLE CONTENT CHANGED",
        changes.changedVisible,
        item => {
            const before =
                visibleMatchCount(
                    item.before
                );

            const after =
                visibleMatchCount(
                    item.after
                );

            return (
                "Visible match signals: " +
                formatMetric(
                    before,
                    after
                )
            );
        }
    );


    addSection(
        lines,
        "HIDDEN CONTENT CHANGED",
        changes.changedHidden,
        item => {
            return (
                "Hidden element occurrences: " +
                formatMetric(
                    item.beforeElements,
                    item.afterElements
                )
            );
        }
    );


    const timestamp =
        reportFilenameTimestamp(now);

    const reportFile =
        path.join(
            config.reportFolder,
            `${config.siteId}-change-report-${timestamp}.txt`
        );


    fs.writeFileSync(
        reportFile,
        `${lines.join("\n")}\n`,
        "utf8"
    );

    return reportFile;
}


function compareReports(config) {

    const currentVisibleFile =
        path.join(
            config.reportFolder,
            "report-visible.json"
        );

    const currentHiddenFile =
        path.join(
            config.reportFolder,
            "report-hidden.json"
        );


    if (
        !fs.existsSync(currentVisibleFile) ||
        !fs.existsSync(currentHiddenFile)
    ) {
        throw new Error(
            `Current reports are missing for ${config.siteId}. ` +
            `Run ${config.indexFile} first.`
        );
    }


    const previousVisibleFile =
        getLatestArchive(
            config.reportFolder,
            "report-visible.json"
        );

    const previousHiddenFile =
        getLatestArchive(
            config.reportFolder,
            "report-hidden.json"
        );


    if (
        !previousVisibleFile ||
        !previousHiddenFile
    ) {
        console.log(
            `No previous archived scan exists for ${config.siteId}.`
        );

        console.log(
            "Run another audit of the same scope first; " +
            "the current reports will then be archived automatically."
        );

        return null;
    }


    const previousVisible =
        loadJson(
            previousVisibleFile
        );

    const previousHidden =
        loadJson(
            previousHiddenFile
        );

    const currentVisible =
        loadJson(
            currentVisibleFile
        );

    const currentHidden =
        loadJson(
            currentHiddenFile
        );


    const previousVisiblePages =
        pageMap(previousVisible);

    const currentVisiblePages =
        pageMap(currentVisible);

    const previousHiddenPages =
        pageMap(previousHidden);

    const currentHiddenPages =
        pageMap(currentHidden);


    const changes = {
        resolvedVisible: [],
        resolvedHidden: [],
        newVisible: [],
        newHidden: [],
        changedVisible: [],
        changedHidden: []
    };


    for (
        const [url, oldPage]
        of previousVisiblePages
    ) {
        if (
            !currentVisiblePages.has(url)
        ) {
            changes.resolvedVisible.push({
                url,
                before:
                    oldPage.matches
            });
        }
    }


    for (
        const [url, newPage]
        of currentVisiblePages
    ) {
        if (
            !previousVisiblePages.has(url)
        ) {
            changes.newVisible.push({
                url,
                after:
                    newPage.matches
            });
        }
    }


    for (
        const [url, oldPage]
        of previousVisiblePages
    ) {
        const newPage =
            currentVisiblePages.get(url);

        if (!newPage) {
            continue;
        }

        if (
            signature(
                oldPage.matches
            ) !==
            signature(
                newPage.matches
            )
        ) {
            changes.changedVisible.push({
                url,
                before:
                    oldPage.matches,
                after:
                    newPage.matches
            });
        }
    }


    for (
        const [url, oldPage]
        of previousHiddenPages
    ) {
        if (
            !currentHiddenPages.has(url)
        ) {
            changes.resolvedHidden.push({
                url,
                before:
                    oldPage.matches,

                beforeElements:
                    hiddenPageStats(
                        oldPage
                    ).elementOccurrences
            });
        }
    }


    for (
        const [url, newPage]
        of currentHiddenPages
    ) {
        if (
            !previousHiddenPages.has(url)
        ) {
            changes.newHidden.push({
                url,
                after:
                    newPage.matches,

                afterElements:
                    hiddenPageStats(
                        newPage
                    ).elementOccurrences
            });
        }
    }


    for (
        const [url, oldPage]
        of previousHiddenPages
    ) {
        const newPage =
            currentHiddenPages.get(url);

        if (!newPage) {
            continue;
        }

        if (
            signature(
                oldPage.matches
            ) !==
            signature(
                newPage.matches
            )
        ) {
            changes.changedHidden.push({
                url,
                before:
                    oldPage.matches,

                after:
                    newPage.matches,

                beforeElements:
                    hiddenPageStats(
                        oldPage
                    ).elementOccurrences,

                afterElements:
                    hiddenPageStats(
                        newPage
                    ).elementOccurrences
            });
        }
    }


    const reportFile =
        writeChangeReport(
            config,
            changes,
            previousVisible,
            currentVisible,
            previousHidden,
            currentHidden
        );


    console.log(
        `Previous visible report: ${previousVisibleFile}`
    );

    console.log(
        `Previous hidden report: ${previousHiddenFile}`
    );

    console.log(
        `Comparison report written: ${reportFile}`
    );


    return reportFile;
}


module.exports = compareReports;