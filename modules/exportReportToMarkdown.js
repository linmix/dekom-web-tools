const fs = require("fs");
const {
    hiddenPageStats,
    summariseReports
} = require("./reportStats");

function loadJson(file) {
    return JSON.parse(
        fs.readFileSync(file, "utf8")
    );
}

function formatDate(isoDate) {
    const date = new Date(isoDate);

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();

    return day + "-" + month + "-" + year;
}

function uniqueMatches(matches) {
    if (!Array.isArray(matches)) {
        return [];
    }

    return Array.from(
        new Set(
            matches
                .map(function(match) {
                    return match.matched;
                })
                .filter(Boolean)
        )
    );
}

function formatVisibleMatches(matches) {

    if (!matches || typeof matches !== "object") {
        return;
    }

    const categories = [
        ["core", "Core"],
        ["connectors", "Connectors"],
        ["prefixes", "Prefixes"],
        ["suffixes", "Suffixes"]
    ];

    for (const category of categories) {

        const key = category[0];
        const label = category[1];

        const values = uniqueMatches(matches[key]);

        const text = values.length
            ? values.join(", ")
            : "—";

        reportLines.push(
            "| " + label + " | " + text + " |"
        );
    }
}

function formatHiddenMatch(match) {

    const type = match.type || "Unknown";
    const text = match.text || "";
    const source = match.source || "";
    const matches = match.matches || {};

    reportLines.push(
        "#### " + type
    );

    reportLines.push("");

    if (source) {

        reportLines.push(
            "**Source:** `" + source + "`"
        );

        reportLines.push("");
    }

    if (text) {

        reportLines.push(
            "> " + text.replace(/\n/g, " ")
        );

        reportLines.push("");
    }

    const categories = [
        ["core", "Core"],
        ["connectors", "Connectors"],
        ["prefixes", "Prefixes"],
        ["suffixes", "Suffixes"]
    ];

    for (const category of categories) {

        const key = category[0];
        const label = category[1];

        const values = uniqueMatches(matches[key]);

        if (values.length) {

            reportLines.push(
                "**" + label + ":** " + values.join(", ")
            );

            reportLines.push("");
        }
    }
}

function addVisiblePage(page) {

    reportLines.push(
        "### [" + page.url + "](" + page.url + ")"
    );

    reportLines.push("");

    reportLines.push(
        "**Visible text**"
    );

    reportLines.push("");

    reportLines.push(
        "| Category | Matches |"
    );

    reportLines.push(
        "|---|---|"
    );

    formatVisibleMatches(page.matches);

    reportLines.push("");
    reportLines.push("---");
    reportLines.push("");
}

function addHiddenPage(page) {

    reportLines.push(
        "### [" + page.url + "](" + page.url + ")"
    );

    reportLines.push("");

    reportLines.push(
        "**Hidden content**"
    );

    reportLines.push("");

    const pageStats = hiddenPageStats(page);

    reportLines.push(
        `**Matching hidden elements:** ${pageStats.elementOccurrences}`
    );

    reportLines.push("");

    if (!Array.isArray(page.matches) || !page.matches.length) {

        reportLines.push(
            "No findings."
        );

        reportLines.push("");

        return;
    }

    for (const match of page.matches) {
        formatHiddenMatch(match);
    }

    reportLines.push("---");
    reportLines.push("");
}


function createMarkdown(
    visibleReport,
    hiddenReport,
    outputFile
) {

    reportLines = [];

    const generated =
        visibleReport.generated ||
        hiddenReport.generated ||
        new Date().toISOString();

    const statistics = summariseReports(
        visibleReport,
        hiddenReport
    );

    reportLines.push(
        "# Language Audit Report"
    );

    reportLines.push("");

    reportLines.push(
        "Generated: " + formatDate(generated)
    );

    const scope =
    visibleReport.scope ||
    hiddenReport.scope ||
    "standard";

const coverage =
    visibleReport.coverage ||
    hiddenReport.coverage ||
    null;


reportLines.push(
    "Audit scope: " +
    (
        scope === "full"
            ? "FULL"
            : "STANDARD"
    )
);

reportLines.push("");


if (coverage) {

    reportLines.push(
        "## Scan Coverage"
    );

    reportLines.push("");

    reportLines.push(
        `URLs selected: ${coverage.requested}`
    );

    reportLines.push(
        `Pages downloaded: ${coverage.downloaded}`
    );

    reportLines.push(
        `Download failures: ${coverage.failed}`
    );

    reportLines.push("");


    if (
        Array.isArray(
            coverage.failures
        ) &&
        coverage.failures.length
    ) {

        reportLines.push(
            "### Failed URLs"
        );

        reportLines.push("");


        for (
            const failure
            of coverage.failures
        ) {

            const status =
                failure.status
                    ? `HTTP ${failure.status}`
                    : "Download error";

            const message =
                failure.message
                    ? ` — ${failure.message}`
                    : "";

            reportLines.push(
                `- ${status}: ${failure.url}${message}`
            );
        }


        reportLines.push("");

        reportLines.push(
            "> **Warning:** This audit is incomplete because one or more selected URLs could not be downloaded."
        );

        reportLines.push("");
    }
}

    reportLines.push("");

    reportLines.push(
        "Visible pages flagged: " + statistics.visible.pagesFlagged
    );

    reportLines.push(
        "Visible distinct match signals: " +
        statistics.visible.distinctMatchSignals
    );

    reportLines.push("");

    reportLines.push(
        "Hidden pages flagged: " + statistics.hidden.pagesFlagged
    );

    reportLines.push(
        "Hidden element occurrences: " +
        statistics.hidden.elementOccurrences
    );

    reportLines.push(
        "Unique hidden remediation units: " +
        statistics.hidden.uniqueRemediationUnits
    );

    reportLines.push(
        "Hidden language-rule hits: " + statistics.hidden.ruleHits
    );

    if (statistics.hidden.byType.length) {
        reportLines.push("");
        reportLines.push("Hidden element types:");

        for (const type of statistics.hidden.byType) {
            reportLines.push(
                `- ${type.type}: ${type.elementOccurrences} occurrences; ` +
                `${type.uniqueRemediationUnits} unique remediation units`
            );
        }
    }

    reportLines.push("");

    reportLines.push(
        "## Visible Findings"
    );

    reportLines.push("");

    if (!visibleReport.pages.length) {

        reportLines.push(
            "No visible findings."
        );

        reportLines.push("");

    } else {

        for (const page of visibleReport.pages) {
            addVisiblePage(page);
        }
    }

    reportLines.push(
        "## Hidden Findings"
    );

    reportLines.push("");

    if (!hiddenReport.pages.length) {

        reportLines.push(
            "No hidden findings."
        );

        reportLines.push("");

    } else {

        for (const page of hiddenReport.pages) {
            addHiddenPage(page);
        }
    }

    fs.writeFileSync(
        outputFile,
        reportLines.join("\n"),
        "utf8"
    );

    console.log(
        "Markdown report written: " + outputFile
    );
}

let reportLines = [];

function exportReportToMarkdown(
    visibleFile,
    hiddenFile,
    outputFile
) {

    const visibleReport = loadJson(visibleFile);
    const hiddenReport = loadJson(hiddenFile);

    createMarkdown(
        visibleReport,
        hiddenReport,
        outputFile
    );
}

module.exports = exportReportToMarkdown;


// --------------------------------------------------
// COMMAND-LINE MODE
// --------------------------------------------------

if (require.main === module) {

    const visibleFile = process.argv[2];
    const hiddenFile = process.argv[3];
    const outputFile = process.argv[4];

    if (!visibleFile || !hiddenFile || !outputFile) {

        console.error(
            "\nUsage:"
        );

        console.error(
            "node exportReportToMarkdown.js <visible.json> <hidden.json> <output.md>\n"
        );

        process.exit(1);
    }


    if (!fs.existsSync(visibleFile)) {

        console.error(
            "Visible report not found: " + visibleFile
        );

        process.exit(1);
    }


    if (!fs.existsSync(hiddenFile)) {

        console.error(
            "Hidden report not found: " + hiddenFile
        );

        process.exit(1);
    }


    exportReportToMarkdown(
        visibleFile,
        hiddenFile,
        outputFile
    );
}
