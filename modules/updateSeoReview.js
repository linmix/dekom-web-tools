const fs = require("fs");
const path = require("path");
const { recordContentReview, auditContent } = require("./seoContentReview");
const {
    SITE_IDS,
    getSite
} = require("../config/sites");

const VALID_DECISIONS = new Set([
    "KEEP",
    "ACCEPT",
    "CUSTOM"
]);




/*
 * ------------------------------------------------
 * Helpers
 * ------------------------------------------------
 */

function readJson(file) {

    return JSON.parse(
        fs.readFileSync(
            file,
            "utf8"
        )
    );
}


function writeJsonAtomic(
    file,
    data
) {

    const temporaryFile =
        `${file}.tmp`;

    fs.writeFileSync(
        temporaryFile,
        JSON.stringify(
            data,
            null,
            2
        ) + "\n",
        "utf8"
    );

    fs.renameSync(
        temporaryFile,
        file
    );
}


function cleanValue(value) {

    if (
        value === undefined ||
        value === null
    ) {
        return null;
    }

    return String(value).trim();
}


function getPageLabel(page) {

    if (
        Array.isArray(page.breadcrumbs) &&
        page.breadcrumbs.length
    ) {

        return page.breadcrumbs[
            page.breadcrumbs.length - 1
        ];
    }

    return page.filename || page.url;
}


function getLiveValue(
    page,
    component
) {

    if (component === "title") {

        return cleanValue(
            page.editableTitle
        ) || "";
    }

    return cleanValue(
        page.description
    ) || "";
}


function getSiteRelativePath(url) {

    const parsed =
        new URL(url);

    const sitePrefixPattern =
        new RegExp(
            `^/(?:${SITE_IDS.join("|")})(?=/|$)`
        );

    let pathname =
        parsed.pathname.replace(
            sitePrefixPattern,
            ""
        );

    if (!pathname) {
        return "/";
    }

    if (
        pathname.length > 1
    ) {

        pathname =
            pathname.replace(
                /\/+$/,
                ""
            );
    }

    return pathname;
}


/*
 * Remove decisions for pages absent from the leader's current inventory.
 * A replacement URL starts without inherited editorial decisions.
 */
function removeAbsentPageDecisions(state, currentPages) {

    const removedUrls = Object.keys(state.pages).filter(
        url => !currentPages.has(getSiteRelativePath(url))
    );

    for (const url of removedUrls) {
        delete state.pages[url];
    }

    if (removedUrls.length) {
        console.log(
            `${state.siteId}: removed editorial decisions for ${removedUrls.length} page(s) absent from the current SEO index.`
        );
        for (const url of removedUrls) console.log(`  ${url}`);
    }

    return removedUrls.length;
}


/*
 * ------------------------------------------------
 * Decision normalization
 * ------------------------------------------------
 */

function buildComponentDecision({
    component,
    input,
    currentPage,
    now
}) {

    if (!input) {
        return null;
    }

    const decision =
        String(
            input.decision || ""
        )
            .trim()
            .toUpperCase();

    if (
        !VALID_DECISIONS.has(
            decision
        )
    ) {

        throw new Error(
            `${component}: invalid decision "${input.decision}". ` +
            `Expected KEEP, ACCEPT or CUSTOM.`
        );
    }


    const reviewedValue =
        getLiveValue(
            currentPage,
            component
        );

    const proposedValue =
        cleanValue(
            input.proposedValue
        );

    let finalValue;


    if (decision === "KEEP") {

        finalValue =
            reviewedValue;

    } else if (
        decision === "ACCEPT"
    ) {

        if (!proposedValue) {

            throw new Error(
                `${component}: ACCEPT requires proposedValue.`
            );
        }

        finalValue =
            proposedValue;

    } else {

        finalValue =
            cleanValue(
                input.finalValue
            );

        if (!finalValue) {

            throw new Error(
                `${component}: CUSTOM requires finalValue.`
            );
        }
    }


    return {
        decision,
        reviewedAt: now,
        reviewedValue,
        proposedValue,
        finalValue
    };
}


/*
 * ------------------------------------------------
 * Implementation-state derivation
 * ------------------------------------------------
 */

function getImplementationStatus(
    componentDecision,
    currentValue
) {

    if (!componentDecision) {
        return "UNREVIEWED";
    }

    const finalValue =
        componentDecision.finalValue;

    const reviewedValue =
        componentDecision.reviewedValue;


    if (
        currentValue === finalValue
    ) {
        return "LIVE";
    }


    if (
        currentValue === reviewedValue &&
        finalValue !== reviewedValue
    ) {
        return "PENDING";
    }


    return "MISMATCH";
}


/*
 * ------------------------------------------------
 * Markdown
 * ------------------------------------------------
 */

function markdownValue(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return "—";
    }

    return String(value)
        .replace(/\r?\n/g, " ")
        .trim();
}


function loadBatchManifest(
    siteId
) {

    const manifestFile =
        path.join(
            ".",
            "SEO",
            siteId,
            "batches",
            "manifest.json"
        );

    if (
        !fs.existsSync(
            manifestFile
        )
    ) {

        throw new Error(
            `SEO batch manifest not found: ${manifestFile}`
        );
    }

    return readJson(
        manifestFile
    );
}


function getBatchReviewGroups(
    state,
    manifest
) {

    const assignedUrls =
        new Set();

    const groups = [];

    for (
        const batch of
        manifest.batches || []
    ) {

        const urls =
            (batch.urls || [])
                .filter(
                    url =>
                        Boolean(
                            state.pages[url]
                        )
                );

        if (
            !urls.length
        ) {
            continue;
        }

        for (
            const url of urls
        ) {
            assignedUrls.add(
                url
            );
        }

        groups.push({
            id: batch.id,
            displayNumber:
                batch.displayNumber,
            label:
                batch.label,
            urls
        });
    }


    const unassignedUrls =
        Object.keys(
            state.pages
        )
            .filter(
                url =>
                    !assignedUrls.has(
                        url
                    )
            )
            .sort();


    if (
        unassignedUrls.length
    ) {

        groups.push({
            id: "unassigned",
            displayNumber: "00",
            label:
                "Unassigned reviewed pages",
            urls:
                unassignedUrls
        });
    }


    return groups;
}


function getBatchReportFilename(
    group
) {

    return `${group.displayNumber}-${group.id}.md`;
}


function getLeaderStats(
    state,
    currentPages,
    urls
) {

    let reviewedTitles = 0;
    let reviewedDescriptions = 0;

    let liveCount = 0;
    let pendingCount = 0;
    let mismatchCount = 0;


    for (
        const url of urls
    ) {

        const record =
            state.pages[url];

        if (
            !record
        ) {
            continue;
        }

        const currentPage =
            currentPages.get(
                getSiteRelativePath(
                    url
                )
            );


        for (
            const component of
            ["title", "description"]
        ) {

            if (
                !record[component]
            ) {
                continue;
            }

            if (
                component === "title"
            ) {
                reviewedTitles++;
            } else {
                reviewedDescriptions++;
            }


            if (
                !currentPage
            ) {

                mismatchCount++;
                continue;
            }


            const status =
                getImplementationStatus(
                    record[component],
                    getLiveValue(
                        currentPage,
                        component
                    )
                );


            if (
                status === "LIVE"
            ) {
                liveCount++;
            }

            if (
                status === "PENDING"
            ) {
                pendingCount++;
            }

            if (
                status === "MISMATCH"
            ) {
                mismatchCount++;
            }
        }
    }


    return {
        pageCount:
            urls.length,
        reviewedTitles,
        reviewedDescriptions,
        componentCount:
            reviewedTitles +
            reviewedDescriptions,
        liveCount,
        pendingCount,
        mismatchCount
    };
}


function getFollowerStats(
    state,
    currentPages,
    urls
) {

    let matchedCount = 0;
    let differsCount = 0;
    let comparablePageCount = 0;
    const missingCount = 0; // compatibility: absent follower pages are parity-only


    for (
        const url of urls
    ) {

        const record =
            state.pages[url];

        if (
            !record
        ) {
            continue;
        }

        const currentPage =
            currentPages.get(
                getSiteRelativePath(
                    url
                )
            );


        // A leader-only page is not a comparable follower SEO page.
        if (!currentPage) continue;
        comparablePageCount++;

        for (
            const component of
            ["title", "description"]
        ) {

            const decision =
                record[component];

            if (
                !decision
            ) {
                continue;
            }



            const currentValue =
                getLiveValue(
                    currentPage,
                    component
                );


            if (
                currentValue ===
                decision.finalValue
            ) {
                matchedCount++;
            } else {
                differsCount++;
            }
        }
    }


    return {
        pageCount:
            comparablePageCount,
        componentCount:
            matchedCount +
            differsCount,
        matchedCount,
        differsCount,
        missingCount
    };
}


function buildLeaderBatchMarkdown({
    siteId,
    state,
    currentPages,
    group
}) {

    const lines = [];

    const stats =
        getLeaderStats(
            state,
            currentPages,
            group.urls
        );


    const actionStats = {
        keepCount: 0,
        replaceCount: 0,
        missingCount: 0
    };


    for (
        const url of group.urls
    ) {

        const record =
            state.pages[url];

        if (
            !record
        ) {
            continue;
        }


        const currentPage =
            currentPages.get(
                getSiteRelativePath(
                    url
                )
            );


        for (
            const component of
            ["title", "description"]
        ) {

            const decision =
                record[component];

            if (
                !decision
            ) {
                continue;
            }


            if (
                !currentPage
            ) {

                actionStats.missingCount++;

                continue;
            }


            const currentValue =
                getLiveValue(
                    currentPage,
                    component
                );


            if (
                currentValue ===
                decision.finalValue
            ) {

                actionStats.keepCount++;

            } else {

                actionStats.replaceCount++;
            }
        }
    }


    lines.push(
        `# SEO editorial decisions — ${siteId}`
    );

    lines.push("");

    lines.push(
        `Batch ${group.displayNumber} — ${group.label}`
    );

    lines.push("");

    lines.push(
        `Last updated: ${state.updatedAt}`
    );

    lines.push("");

    lines.push("## Summary");
    lines.push("");

    lines.push(
        `- Reviewed pages: ${stats.pageCount}`
    );

    lines.push(
        `- KEEP: ${actionStats.keepCount}`
    );

    lines.push(
        `- REPLACE: ${actionStats.replaceCount}`
    );

    lines.push(
        `- PAGE MISSING: ${actionStats.missingCount}`
    );

    lines.push("");


    for (
        const url of group.urls
    ) {

        const record =
            state.pages[url];

        if (
            !record
        ) {
            continue;
        }

        const currentPage =
            currentPages.get(
                getSiteRelativePath(
                    url
                )
            );


        lines.push(
            `## ${record.label || url}`
        );

        lines.push("");

        lines.push(
            `URL: ${url}`
        );

        lines.push("");

        lines.push(
            `Last reviewed: ${record.reviewedAt}`
        );

        lines.push("");


        for (
            const component of
            ["title", "description"]
        ) {

            const decision =
                record[component];

            if (
                !decision
            ) {
                continue;
            }


            const heading =
                component === "title"
                    ? "Title"
                    : "Description";

            let currentValue = null;

            let implementationStatus =
                "PAGE NOT IN CURRENT INDEX";


            if (
                currentPage
            ) {

                currentValue =
                    getLiveValue(
                        currentPage,
                        component
                    );

                implementationStatus =
                    getImplementationStatus(
                        decision,
                        currentValue
                    );
            }


            lines.push(
                `### ${heading}`
            );

            lines.push("");

            lines.push(
                "Current:"
            );

            lines.push("");

            lines.push(
                markdownValue(
                    currentValue
                )
            );

            lines.push("");


            if (
                !currentPage
            ) {

                lines.push(
                    "**PAGE MISSING**"
                );

                lines.push("");

                lines.push(
                    "Expected:"
                );

                lines.push("");

                lines.push(
                    markdownValue(
                        decision.finalValue
                    )
                );

                lines.push("");

            } else if (
                currentValue ===
                decision.finalValue
            ) {

                lines.push(
                    "**KEEP**"
                );

                lines.push("");

            } else {

                lines.push(
                    "**REPLACE**"
                );

                lines.push("");

                lines.push(
                    markdownValue(
                        decision.finalValue
                    )
                );

                lines.push("");
            }
        }
    }


    return lines.join(
        "\n"
    ) + "\n";
}


function buildFollowerBatchMarkdown({
    siteId,
    leadingSite,
    state,
    currentPages,
    group
}) {

    const lines = [];

    const stats =
        getFollowerStats(
            state,
            currentPages,
            group.urls
        );


    lines.push(
        `# SEO implementation report — ${siteId}`
    );

    lines.push("");

    lines.push(
        `Editorial source: ${leadingSite}`
    );

    lines.push(
        `Batch ${group.displayNumber} — ${group.label}`
    );

    lines.push("");

    lines.push(
        `Authoritative decisions last updated: ${state.updatedAt}`
    );

    lines.push("");

    lines.push("## Summary");
    lines.push("");

    lines.push(
        `- Reviewed pages: ${stats.pageCount}`
    );

    lines.push(
        `- MATCH components: ${stats.matchedCount}`
    );

    lines.push(
        `- DIFFERS components: ${stats.differsCount}`
    );

    lines.push("");


    for (
        const url of group.urls
    ) {

        const record =
            state.pages[url];

        if (
            !record
        ) {
            continue;
        }

        const relativePath =
            getSiteRelativePath(
                url
            );

        const currentPage =
            currentPages.get(
                relativePath
            );

        // Nonexistent follower pages belong in parity reporting, not SEO reporting.
        if (!currentPage) continue;


        lines.push(
            `## ${record.label || relativePath}`
        );

        lines.push("");

        lines.push(
            `Path: ${relativePath}`
        );

        lines.push("");


        for (
            const component of
            ["title", "description"]
        ) {

            const decision =
                record[component];

            if (
                !decision
            ) {
                continue;
            }


            const heading =
                component === "title"
                    ? "Title"
                    : "Description";

            let currentValue = null;
            let status = "PAGE MISSING";


            if (
                currentPage
            ) {

                currentValue =
                    getLiveValue(
                        currentPage,
                        component
                    );

                status =
                    currentValue ===
                    decision.finalValue
                        ? "MATCH"
                        : "DIFFERS";
            }


            lines.push(
                `### ${heading}`
            );

            lines.push("");

            lines.push(
                `**${status}**`
            );

            lines.push("");


            if (
                status === "MATCH"
            ) {

                lines.push(
                    markdownValue(
                        decision.finalValue
                    )
                );

                lines.push("");

            } else if (
                status === "DIFFERS"
            ) {

                lines.push(
                    "**Should be**"
                );

                lines.push("");

                lines.push(
                    markdownValue(
                        decision.finalValue
                    )
                );

                lines.push("");

                lines.push(
                    `**Currently ${siteId}**`
                );

                lines.push("");

                lines.push(
                    markdownValue(
                        currentValue
                    )
                );

                lines.push("");

            } else {

                lines.push(
                    `Expected from ${leadingSite}:`
                );

                lines.push("");

                lines.push(
                    markdownValue(
                        decision.finalValue
                    )
                );

                lines.push("");
            }
        }
    }


    return lines.join(
        "\n"
    ) + "\n";
}


function buildLeaderIndexMarkdown({
    siteId,
    state,
    currentPages,
    groups
}) {

    const lines = [];

    const allUrls =
        Object.keys(
            state.pages
        );

    const totals =
        getLeaderStats(
            state,
            currentPages,
            allUrls
        );


    lines.push(
        `# SEO editorial decisions — ${siteId}`
    );

    lines.push("");

    lines.push(
        `Last updated: ${state.updatedAt}`
    );

    lines.push("");

    lines.push("## Summary");
    lines.push("");

    lines.push(
        `- Pages with recorded decisions: ${allUrls.length}`
    );

    lines.push(
        `- Reviewed titles: ${totals.reviewedTitles}`
    );

    lines.push(
        `- Reviewed descriptions: ${totals.reviewedDescriptions}`
    );

    lines.push(
        `- LIVE components: ${totals.liveCount}`
    );

    lines.push(
        `- PENDING components: ${totals.pendingCount}`
    );

    lines.push(
        `- MISMATCH components: ${totals.mismatchCount}`
    );

    lines.push("");

    lines.push("## Batches");
    lines.push("");


    for (
        const group of groups
    ) {

        const stats =
            getLeaderStats(
                state,
                currentPages,
                group.urls
            );

        const filename =
            getBatchReportFilename(
                group
            );


        lines.push(
            `### ${group.displayNumber} — ${group.label}`
        );

        lines.push("");

        lines.push(
            `- Reviewed pages: ${stats.pageCount}`
        );

        lines.push(
            `- Components: ${stats.componentCount}`
        );

        lines.push(
            `- LIVE: ${stats.liveCount}`
        );

        lines.push(
            `- PENDING: ${stats.pendingCount}`
        );

        lines.push(
            `- MISMATCH: ${stats.mismatchCount}`
        );

        lines.push(
            `- Report: batches/${filename}`
        );

        lines.push("");
    }


    return lines.join(
        "\n"
    ) + "\n";
}


function buildLeaderChangesMarkdown({
    siteId,
    state,
    currentPages,
    groups
}) {

    const lines = [];
    const actionableGroups = [];

    let pendingCount = 0;
    let mismatchCount = 0;
    let missingCount = 0;
    let affectedPageCount = 0;


    for (const group of groups) {

        const pages = [];


        for (const url of group.urls) {

            const record = state.pages[url];

            if (!record) {
                continue;
            }

            const currentPage = currentPages.get(
                getSiteRelativePath(url)
            );

            const components = [];


            for (const component of ["title", "description"]) {

                const decision = record[component];

                if (!decision) {
                    continue;
                }


                if (!currentPage) {

                    missingCount++;

                    components.push({
                        component,
                        status: "PAGE MISSING",
                        currentValue: null,
                        finalValue: decision.finalValue
                    });

                    continue;
                }


                const currentValue = getLiveValue(
                    currentPage,
                    component
                );

                const status = getImplementationStatus(
                    decision,
                    currentValue
                );


                if (status === "LIVE") {
                    continue;
                }

                if (status === "PENDING") {
                    pendingCount++;
                }

                if (status === "MISMATCH") {
                    mismatchCount++;
                }


                components.push({
                    component,
                    status,
                    currentValue,
                    finalValue: decision.finalValue
                });
            }


            if (components.length) {

                pages.push({
                    url,
                    label: record.label || url,
                    components
                });

                affectedPageCount++;
            }
        }


        if (pages.length) {
            actionableGroups.push({
                ...group,
                pages
            });
        }
    }


    lines.push(`# SEO changes to implement \u2014 ${siteId}`);
    lines.push("");


    if (!actionableGroups.length) {

        lines.push("No changes to implement.");
        lines.push("");

        return lines.join("\n") + "\n";
    }


    lines.push(
        `Changes to implement: ${pendingCount} component${pendingCount === 1 ? "" : "s"}`
    );

    if (mismatchCount) {
        lines.push(
            `Mismatches to inspect: ${mismatchCount}`
        );
    }

    if (missingCount) {
        lines.push(
            `Missing-page components to inspect: ${missingCount}`
        );
    }

    lines.push(
        `Affected pages: ${affectedPageCount}`
    );

    lines.push("");


    for (const group of actionableGroups) {

        lines.push(
            `## Batch ${group.displayNumber} \u2014 ${group.label}`
        );

        lines.push("");


        for (const page of group.pages) {

            lines.push(
                `### ${page.label}`
            );

            lines.push("");

            lines.push(
                `\`${getSiteRelativePath(page.url)}\``
            );

            lines.push("");


            for (const item of page.components) {

                const heading =
                    item.component === "title"
                        ? "Title"
                        : "Description";


                if (item.status === "MISMATCH") {
                    lines.push(
                        "**MISMATCH \u2014 inspect before changing**"
                    );
                    lines.push("");
                }

                if (item.status === "PAGE MISSING") {
                    lines.push(
                        "**PAGE MISSING \u2014 inspect before changing**"
                    );
                    lines.push("");
                }


                lines.push(`**${heading}:**`);
                lines.push("");
                lines.push(
                    markdownValue(item.finalValue)
                );
                lines.push("");


                if (item.status === "MISMATCH") {
                    lines.push(
                        `Current ${item.component}:`
                    );
                    lines.push("");
                    lines.push(
                        markdownValue(item.currentValue)
                    );
                    lines.push("");
                }
            }


            lines.push("");
            lines.push("&nbsp;");
            lines.push("");
            lines.push("---");
            lines.push("");
        }
    }


    return lines.join("\n") + "\n";
}


function buildFollowerChangesMarkdown({
    siteId,
    leadingSite,
    state,
    currentPages,
    leadingIndex,
    groups
}) {

    const lines = [
        `# SEO changes to implement \u2014 ${siteId}`,
        "",
        `Editorial source: ${leadingSite}`,
        `Authoritative decisions last updated: ${state.updatedAt}`,
        ""
    ];

    const actionableGroups = [];
    let differsCount = 0;
    let affectedPageCount = 0;

    for (const group of groups) {
        const pages = [];

        for (const url of group.urls) {
            const record = state.pages[url];
            if (!record) continue;

            const relativePath = getSiteRelativePath(url);
            const currentPage = currentPages.get(relativePath);
            // Report absent follower pages only in the parity list below.
            if (!currentPage) continue;
            const components = [];

            for (const component of ["title", "description"]) {
                const decision = record[component];
                if (!decision) continue;

                const currentValue = getLiveValue(currentPage, component);
                if (currentValue === decision.finalValue) continue;

                differsCount++;
                components.push({
                    component,
                    status: "DIFFERS",
                    finalValue: decision.finalValue,
                    currentValue
                });
            }

            if (components.length) {
                pages.push({
                    relativePath,
                    label: record.label || relativePath,
                    components
                });
                affectedPageCount++;
            }
        }

        if (pages.length) actionableGroups.push({ ...group, pages });
    }

    const authoritativePaths = new Set(
        leadingIndex.map(page => getSiteRelativePath(page.url))
    );
    const leaderOnlyPages = leadingIndex
        .filter(page => !currentPages.has(getSiteRelativePath(page.url)))
        .map(page => getSiteRelativePath(page.url))
        .sort();
    const followerOnlyPages = Array.from(currentPages.keys())
        .filter(relativePath => !authoritativePaths.has(relativePath))
        .sort();

    const followerStats = getFollowerStats(state, currentPages, Object.keys(state.pages));
    lines.push(`MATCH components: ${followerStats.matchedCount}`);
    lines.push(`DIFFERS components: ${differsCount}`);
    lines.push(`Affected reviewed pages: ${affectedPageCount}`);
    lines.push(`Leader-only pages: ${leaderOnlyPages.length}`);
    lines.push(`Follower-only pages: ${followerOnlyPages.length}`);
    lines.push("");

    if (!actionableGroups.length) {
        lines.push("No reviewed metadata changes to implement.", "");
    }

    for (const group of actionableGroups) {
        lines.push(`## Batch ${group.displayNumber} \u2014 ${group.label}`, "");

        for (const page of group.pages) {
            lines.push(`### ${page.label}`, "");
            lines.push(`\`${page.relativePath}\``, "");

            for (const item of page.components) {
                const heading = item.component === "title" ? "Title" : "Description";
                lines.push(`**${heading} \u2014 ${item.status}**`, "");
                lines.push("Should be:", "", markdownValue(item.finalValue), "");

                if (item.status === "DIFFERS") {
                    lines.push(
                        `Currently ${siteId}:`,
                        "",
                        markdownValue(item.currentValue),
                        ""
                    );
                }
            }

            lines.push("---", "");
        }
    }

    if (leaderOnlyPages.length) {
        lines.push(`## Pages only in ${leadingSite}`, "");
        lines.push(...leaderOnlyPages.map(page => `- \`${page}\``), "");
    }

    if (followerOnlyPages.length) {
        lines.push(`## Pages only in ${siteId}`, "");
        lines.push(...followerOnlyPages.map(page => `- \`${page}\``), "");
    }

    return lines.join("\n") + "\n";
}


function buildFollowerIndexMarkdown({
    siteId,
    leadingSite,
    state,
    currentPages,
    leadingIndex,
    groups
}) {

    const lines = [];

    const allUrls =
        Object.keys(
            state.pages
        );

    const totals =
        getFollowerStats(
            state,
            currentPages,
            allUrls
        );


    const authoritativePaths =
        new Set(
            leadingIndex.map(
                page =>
                    getSiteRelativePath(
                        page.url
                    )
            )
        );


    const followerOnlyPages =
        Array.from(
            currentPages.entries()
        )
            .filter(
                ([relativePath]) =>
                    !authoritativePaths.has(
                        relativePath
                    )
            )
            .sort(
                ([pathA], [pathB]) =>
                    pathA.localeCompare(
                        pathB
                    )
            );


    const leaderOnlyPages =
        leadingIndex
            .filter(
                page =>
                    !currentPages.has(
                        getSiteRelativePath(
                            page.url
                        )
                    )
            )
            .sort(
                (pageA, pageB) =>
                    getSiteRelativePath(
                        pageA.url
                    ).localeCompare(
                        getSiteRelativePath(
                            pageB.url
                        )
                    )
            );


    lines.push(
        `# SEO implementation report — ${siteId}`
    );

    lines.push("");

    lines.push(
        `Editorial source: ${leadingSite}`
    );

    lines.push("");

    lines.push(
        `Authoritative decisions last updated: ${state.updatedAt}`
    );

    lines.push("");

    lines.push("## Summary");
    lines.push("");

    lines.push(
        `- Pages with authoritative decisions: ${allUrls.length}`
    );

    lines.push(
        `- MATCH components: ${totals.matchedCount}`
    );

    lines.push(
        `- DIFFERS components: ${totals.differsCount}`
    );

    lines.push(
        `- Leader-only pages: ${leaderOnlyPages.length}`
    );

    lines.push(
        `- Follower-only pages: ${followerOnlyPages.length}`
    );

    lines.push("");

    lines.push("## Batches");
    lines.push("");


    for (
        const group of groups
    ) {

        const stats =
            getFollowerStats(
                state,
                currentPages,
                group.urls
            );

        const filename =
            getBatchReportFilename(
                group
            );


        lines.push(
            `### ${group.displayNumber} — ${group.label}`
        );

        lines.push("");

        lines.push(
            `- Reviewed pages: ${stats.pageCount}`
        );

        lines.push(
            `- Components: ${stats.componentCount}`
        );

        lines.push(
            `- MATCH: ${stats.matchedCount}`
        );

        lines.push(
            `- DIFFERS: ${stats.differsCount}`
        );

        lines.push(
            `- Report: batches/${filename}`
        );

        lines.push("");
    }


    if (
        leaderOnlyPages.length
    ) {

        lines.push(
            `## Pages only in ${leadingSite}`
        );

        lines.push("");

        for (
            const page of
            leaderOnlyPages
        ) {

            lines.push(
                `- ${getSiteRelativePath(
                    page.url
                )} — ${getPageLabel(
                    page
                )}`
            );
        }

        lines.push("");
    }


    if (
        followerOnlyPages.length
    ) {

        lines.push(
            `## Pages only in ${siteId}`
        );

        lines.push("");

        for (
            const [
                relativePath,
                page
            ] of followerOnlyPages
        ) {

            lines.push(
                `- ${relativePath} — ${getPageLabel(
                    page
                )}`
            );
        }

        lines.push("");
    }


    return lines.join(
        "\n"
    ) + "\n";
}


function writeReviewReports({
    siteId,
    leadingSite,
    state,
    currentPages,
    leadingIndex,
    markdownDir
}) {

    const manifest =
        loadBatchManifest(
            leadingSite
        );

    const groups =
        getBatchReviewGroups(
            state,
            manifest
        );

    const contentAudit = auditContent({ siteId, leadingSite, state, currentPages,
        leadingIndex, groups, relativePath: getSiteRelativePath });

    const batchMarkdownDir =
        path.join(
            markdownDir,
            "batches"
        );


    fs.rmSync(
        batchMarkdownDir,
        {
            recursive: true,
            force: true
        }
    );

    fs.mkdirSync(
        batchMarkdownDir,
        {
            recursive: true
        }
    );


    for (
        const group of groups
    ) {

        const filename =
            getBatchReportFilename(
                group
            );

        const content =
            siteId === leadingSite
                ? buildLeaderBatchMarkdown({
                    siteId,
                    state,
                    currentPages,
                    group
                })
                : buildFollowerBatchMarkdown({
                    siteId,
                    leadingSite,
                    state,
                    currentPages,
                    group
                });


        fs.writeFileSync(
            path.join(
                batchMarkdownDir,
                filename
            ),
                content + "\n## Editorial content status\n\n" +
                    contentAudit.rows.filter(r => group.urls.includes(r.url))
                        .map(r => `- ${r.path}: **${r.status}**`).join("\n") + "\n",
            "utf8"
        );
    }


    const indexMarkdown =
        siteId === leadingSite
            ? buildLeaderIndexMarkdown({
                siteId,
                state,
                currentPages,
                groups
            })
            : buildFollowerIndexMarkdown({
                siteId,
                leadingSite,
                state,
                currentPages,
                leadingIndex,
                groups
            });


    const markdownFile =
        path.join(
            markdownDir,
            "decisions.md"
        );


    fs.writeFileSync(
        markdownFile,
        indexMarkdown + "\n" + contentAudit.summary,
        "utf8"
    );


    const changesMarkdownFile = path.join(markdownDir, "changes.md");

    const changesMarkdown = siteId === leadingSite
        ? buildLeaderChangesMarkdown({ siteId, state, currentPages, groups })
        : buildFollowerChangesMarkdown({
            siteId,
            leadingSite,
            state,
            currentPages,
            leadingIndex,
            groups
        });

    fs.writeFileSync(changesMarkdownFile, changesMarkdown, "utf8");

    const contentChangesMarkdownFile = path.join(markdownDir, "content-changes.md");
    fs.writeFileSync(contentChangesMarkdownFile, contentAudit.markdown, "utf8");


    return {
        markdownFile,
        changesMarkdownFile,
        contentChangesMarkdownFile,
        batchMarkdownDir,
        batchReportCount:
            groups.length
    };
}


/*
 * ------------------------------------------------
 * Main update
 * ------------------------------------------------
 */

function updateSeoReview(
    siteId,
    payload
) {

    const site =
        getSite(siteId);

    const leadingSite =
        site.reviewLeader;

    if (
        leadingSite !== siteId
    ) {

        throw new Error(
            `${siteId} is a follower site. Editorial SEO decisions must be recorded against ${leadingSite}.`
        );
    }


    const seoDir =
        path.join(
            ".",
            "SEO",
            siteId
        );

    const indexFile =
        path.join(
            seoDir,
            "index.json"
        );

    const reviewDir =
        path.join(
            seoDir,
            "review"
        );

    const decisionsFile =
        path.join(
            reviewDir,
            "decisions.json"
        );

    const markdownFile =
        path.join(
            reviewDir,
            "decisions.md"
        );


    if (
        !fs.existsSync(indexFile)
    ) {

        throw new Error(
            `SEO index not found: ${indexFile}`
        );
    }


    if (
        !payload ||
        !Array.isArray(payload.pages)
    ) {

        throw new Error(
            'Input must contain a "pages" array.'
        );
    }


    fs.mkdirSync(
        reviewDir,
        {
            recursive: true
        }
    );


    const index =
        readJson(indexFile);

    const currentPages =
        new Map(
            index.map(
                page => [
                    getSiteRelativePath(
                        page.url
                    ),
                    page
                ]
            )
        );


    let state = {
        version: 1,
        siteId,
        updatedAt: null,
        pages: {}
    };


    if (
        fs.existsSync(
            decisionsFile
        )
    ) {

        state =
            readJson(
                decisionsFile
            );

        if (
            state.siteId !== siteId
        ) {

            throw new Error(
                `Review file belongs to ${state.siteId}, not ${siteId}.`
            );
        }
    }


    const now =
        new Date().toISOString();

    let pagesUpdated = 0;
    let componentsUpdated = 0;


    for (
        const inputPage of
        payload.pages
    ) {

        const url =
            cleanValue(
                inputPage.url
            );


        if (!url) {

            throw new Error(
                "Every review entry requires a URL."
            );
        }


        const currentPage =
            currentPages.get(
                getSiteRelativePath(
                    url
                )
            );


        if (!currentPage) {

            throw new Error(
                `URL not found in current SEO index: ${url}`
            );
        }


        const existing =
            state.pages[url] || {
                label:
                    getPageLabel(
                        currentPage
                    ),
                reviewedAt: now
            };


        let changed = false;

        if (inputPage.contentReviewed !== undefined && typeof inputPage.contentReviewed !== "boolean") {
            throw new Error("contentReviewed must be true or false.");
        }


        for (
            const component of
            ["title", "description"]
        ) {

            if (
                inputPage[component] ===
                undefined
            ) {
                continue;
            }


            const componentDecision =
                buildComponentDecision({
                    component,
                    input:
                        inputPage[
                            component
                        ],
                    currentPage,
                    now
                });


            existing[component] =
                componentDecision;

            componentsUpdated++;
            changed = true;
        }


        // Both metadata components together represent a complete editorial review.
        // contentReviewed also supports explicit reaffirmation without changing copy.
        const contentReviewed = inputPage.contentReviewed === true ||
            (inputPage.contentReviewed !== false && inputPage.title && inputPage.description);
        if (contentReviewed) {
            if (!existing.title || !existing.description) {
                throw new Error(`Both title and description decisions are required before confirming content review: ${url}`);
            }
            existing.contentReview = recordContentReview(siteId, currentPage, now);
            changed = true;
        }

        if (changed) {

            existing.label =
                inputPage.label ||
                existing.label ||
                getPageLabel(
                    currentPage
                );

            existing.reviewedAt =
                now;

            state.pages[url] =
                existing;

            pagesUpdated++;
        }
    }


    const pagesRemoved = removeAbsentPageDecisions(state, currentPages);

    state.updatedAt =
        now;


    writeJsonAtomic(
        decisionsFile,
        state
    );


    const reports =
        writeReviewReports({
            siteId,
            leadingSite: siteId,
            state,
            currentPages,
            leadingIndex: index,
            markdownDir: reviewDir
        });


    return {
        pagesUpdated,
        componentsUpdated,
        pagesRemoved,
        decisionCount:
            Object.keys(
                state.pages
            ).length,
        decisionsFile,
        markdownFile:
            reports.markdownFile,
        changesMarkdownFile:
            reports.changesMarkdownFile,
        contentChangesMarkdownFile: reports.contentChangesMarkdownFile
    };
}


/*
 * ------------------------------------------------
 * Refresh human-readable review ledger
 * ------------------------------------------------
 */

function refreshSeoReviewMarkdown(
    siteId
) {

    const seoDir =
        path.join(
            ".",
            "SEO",
            siteId
        );

    const indexFile =
        path.join(
            seoDir,
            "index.json"
        );

    const site =
        getSite(siteId);

    const leadingSite =
        site.reviewLeader;

    const leadingIndexFile =
        path.join(
            ".",
            "SEO",
            leadingSite,
            "index.json"
        );

    const reviewDir =
        path.join(
            ".",
            "SEO",
            leadingSite,
            "review"
        );

    const decisionsFile =
        path.join(
            reviewDir,
            "decisions.json"
        );

    const markdownDir =
        path.join(
            seoDir,
            "review"
        );

    const markdownFile =
        path.join(
            markdownDir,
            "decisions.md"
        );


    /*
     * No review state yet:
     * nothing needs to be refreshed.
     */

    if (
        !fs.existsSync(
            decisionsFile
        )
    ) {

        return {
            refreshed: false,
            reason: "no-decisions"
        };
    }


    if (
        !fs.existsSync(
            indexFile
        )
    ) {

        throw new Error(
            `SEO index not found: ${indexFile}`
        );
    }


    const state =
        readJson(
            decisionsFile
        );


    if (
        state.siteId !== leadingSite
    ) {

        throw new Error(
            `Review file belongs to ${state.siteId}, not ${leadingSite}.`
        );
    }


    const index =
        readJson(
            indexFile
        );

    const leadingIndex =
        readJson(
            leadingIndexFile
        );


    const currentPages =
        new Map(
            index.map(
                page => [
                    getSiteRelativePath(
                        page.url
                    ),
                    page
                ]
            )
        );


    // Only a leader refresh may change its authoritative editorial state.
    // A missing follower page is a parity note, not an actionable SEO warning.
    let pagesRemoved = 0;
    if (siteId === leadingSite) {
        pagesRemoved = removeAbsentPageDecisions(state, currentPages);
        if (pagesRemoved) {
            state.updatedAt = new Date().toISOString();
            writeJsonAtomic(decisionsFile, state);
        }
    }

    fs.mkdirSync(
        markdownDir,
        {
            recursive: true
        }
    );


    const reports =
        writeReviewReports({
            siteId,
            leadingSite,
            state,
            currentPages,
            leadingIndex,
            markdownDir
        });


    return {
        refreshed: true,
        pagesRemoved,
        markdownFile:
            reports.markdownFile,
        changesMarkdownFile:
            reports.changesMarkdownFile,
        contentChangesMarkdownFile: reports.contentChangesMarkdownFile,
        batchReportCount:
            reports.batchReportCount
    };
}


module.exports =
    updateSeoReview;

module.exports.refreshMarkdown =
    refreshSeoReviewMarkdown;
