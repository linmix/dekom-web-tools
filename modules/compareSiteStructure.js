const fs = require("fs");
const path = require("path");
const { SITE_IDS } = require("../config/sites");

const projectRoot =
    path.resolve(__dirname, "..");

const aliasFile =
    path.join(
        projectRoot,
        "config",
        "site-structure-aliases.json"
    );


function loadJson(file) {
    return JSON.parse(
        fs.readFileSync(file, "utf8")
    );
}


function normaliseText(value) {
    return decodeURIComponent(
        String(value || "")
    )
        .trim()
        .toLowerCase();
}


function relativeSegments(url) {
    const pathname =
        new URL(url).pathname;

    const segments =
        pathname
            .split("/")
            .filter(Boolean);

    if (
        segments.length &&
        SITE_IDS.includes(
            segments[0].toLowerCase()
        )
    ) {
        segments.shift();
    }

    return segments;
}


function relativePath(url) {
    return relativeSegments(url)
        .map(normaliseText)
        .join("/");
}


function createCanonicaliser(aliasConfig) {

    const segmentAliases =
        aliasConfig.segmentAliases || {};

    const pathAliases =
        aliasConfig.pathAliases || {};


    function canonicalSegment(segment) {

        const normalised =
            normaliseText(segment);

        return (
            segmentAliases[normalised] ||
            normalised
        );
    }


    return function canonicalKey(url) {

        const segments =
            relativeSegments(url);

        if (!segments.length) {
            return "(root)";
        }


        /*
         * News pages have a stable numeric content ID.
         *
         * Example:
         * /news/4469/20260710-Projecting-Success
         *
         * The slug may differ between languages,
         * but content ID 4469 identifies the same item.
         */
        if (
            normaliseText(
                segments[0]
            ) === "news" &&
            segments.length >= 2 &&
            /^\d+$/.test(
                segments[1]
            )
        ) {
            return `news/${segments[1]}`;
        }


        const rawPath =
            segments
                .map(normaliseText)
                .join("/");

        if (pathAliases[rawPath]) {
            return pathAliases[rawPath];
        }


        return segments
            .map(canonicalSegment)
            .join("/");
    };
}


function loadSiteUrls(
    siteId,
    full
) {

    const filename =
        full
            ? "urls-full.json"
            : "urls-check.json";


    const file =
        path.join(
            projectRoot,
            "cache",
            siteId,
            filename
        );


    if (!fs.existsSync(file)) {

        const scope =
            full
                ? "full-site"
                : "standard";

        throw new Error(
            `Missing ${scope} URL file for ${siteId}: ${file}`
        );
    }


    const urls =
        loadJson(file);


    if (!Array.isArray(urls)) {
        throw new Error(
            `${file} does not contain a JSON array.`
        );
    }


    return urls;
}


function buildLogicalMap(
    siteId,
    urls,
    canonicalKey
) {

    const map =
        new Map();


    for (const url of urls) {

        const key =
            canonicalKey(url);


        if (!map.has(key)) {
            map.set(
                key,
                []
            );
        }


        map.get(key)
            .push(url);
    }


    return map;
}


function shortUrl(url) {
    return new URL(url).pathname;
}


function markdownUrl(urls) {

    if (
        !urls ||
        !urls.length
    ) {
        return "—";
    }


    if (urls.length === 1) {

        const url =
            urls[0];

        return (
            `[${shortUrl(url)}](${url})`
        );
    }


    return urls
        .map(
            url =>
                `[${shortUrl(url)}](${url})`
        )
        .join("<br>");
}


function getExactRelativeSet(urls) {

    return new Map(
        urls.map(
            url => [
                relativePath(url),
                url
            ]
        )
    );
}


function exactDifferences(
    leftUrls,
    rightUrls
) {

    const left =
        getExactRelativeSet(
            leftUrls
        );

    const right =
        getExactRelativeSet(
            rightUrls
        );


    const onlyLeft = [];
    const onlyRight = [];


    for (
        const [relative, url]
        of left
    ) {

        if (!right.has(relative)) {
            onlyLeft.push({
                relative,
                url
            });
        }
    }


    for (
        const [relative, url]
        of right
    ) {

        if (!left.has(relative)) {
            onlyRight.push({
                relative,
                url
            });
        }
    }


    return {

        onlyLeft:
            onlyLeft.sort(
                (a, b) =>
                    a.relative.localeCompare(
                        b.relative
                    )
            ),

        onlyRight:
            onlyRight.sort(
                (a, b) =>
                    a.relative.localeCompare(
                        b.relative
                    )
            )
    };
}


function addExactDifferenceSection(
    lines,
    heading,
    leftId,
    rightId,
    differences
) {

    lines.push(
        `## ${heading}`
    );

    lines.push("");


    lines.push(
        `### Present only on ${leftId}`
    );

    lines.push("");


    if (
        !differences.onlyLeft.length
    ) {

        lines.push(
            "None."
        );

    } else {

        for (
            const item
            of differences.onlyLeft
        ) {

            lines.push(
                `- [${item.relative}](${item.url})`
            );
        }
    }


    lines.push("");


    lines.push(
        `### Present only on ${rightId}`
    );

    lines.push("");


    if (
        !differences.onlyRight.length
    ) {

        lines.push(
            "None."
        );

    } else {

        for (
            const item
            of differences.onlyRight
        ) {

            lines.push(
                `- [${item.relative}](${item.url})`
            );
        }
    }


    lines.push("");
}


function compareSiteStructure(
    options = {}
) {

    const full =
        options.full === true;


    const scopeLabel =
        full
            ? "FULL"
            : "STANDARD";


    const outputFolder =
        full
            ? path.join(
                projectRoot,
                "output",
                "site-structure",
                "full"
            )
            : path.join(
                projectRoot,
                "output",
                "site-structure"
            );


    const aliasConfig =
        loadJson(aliasFile);


    const canonicalKey =
        createCanonicaliser(
            aliasConfig
        );


    const siteUrls =
        Object.fromEntries(
            SITE_IDS.map(
                siteId => [
                    siteId,
                    loadSiteUrls(
                        siteId,
                        full
                    )
                ]
            )
        );


    const logicalMaps =
        Object.fromEntries(
            SITE_IDS.map(
                siteId => [
                    siteId,
                    buildLogicalMap(
                        siteId,
                        siteUrls[siteId],
                        canonicalKey
                    )
                ]
            )
        );


    const allKeys =
        new Set();


    for (
        const map
        of Object.values(
            logicalMaps
        )
    ) {

        for (
            const key
            of map.keys()
        ) {

            allKeys.add(key);
        }
    }


    const rows =
        [...allKeys]
            .sort()
            .map(
                key => {

                    const sites =
                        Object.fromEntries(
                            SITE_IDS.map(
                                siteId => [
                                    siteId,
                                    logicalMaps[
                                        siteId
                                    ].get(key) || []
                                ]
                            )
                        );


                    const missing =
                        SITE_IDS.filter(
                            siteId =>
                                !sites[
                                    siteId
                                ].length
                        );


                    return {
                        key,
                        sites,
                        missing
                    };
                }
            );


    const completeRows =
        rows.filter(
            row =>
                row.missing.length === 0
        );


    const discrepancyRows =
        rows.filter(
            row =>
                row.missing.length > 0
        );


    const collisions = [];


    for (
        const siteId
        of SITE_IDS
    ) {

        for (
            const [key, urls]
            of logicalMaps[siteId]
        ) {

            if (
                urls.length > 1
            ) {

                collisions.push({
                    siteId,
                    key,
                    urls
                });
            }
        }
    }


    const dutchExact =
        exactDifferences(
            siteUrls["nl-nl"],
            siteUrls["nl-be"]
        );


    const englishExact =
        exactDifferences(
            siteUrls["en-nl"],
            siteUrls["en-gb"]
        );


    fs.mkdirSync(
        outputFolder,
        {
            recursive: true
        }
    );


    /*
     * --------------------------------
     * Discrepancy report
     * --------------------------------
     */

    const discrepancyLines = [

        "# DEKOM Site Structure Comparison",

        "",

        `Generated: ${new Date().toISOString()}`,

        "",

        `Comparison scope: ${scopeLabel}`,

        "",

        "## Input",

        "",

        "| Site | URLs checked |",
        "|---|---:|",

        ...SITE_IDS.map(
            siteId =>
                `| ${siteId} | ${siteUrls[siteId].length} |`
        ),

        "",

        "## Logical page summary",

        "",

        `- Logical pages identified: ${rows.length}`,
        `- Present on all four sites: ${completeRows.length}`,
        `- Pages with one or more missing equivalents: ${discrepancyRows.length}`,
        `- Normalisation collisions requiring review: ${collisions.length}`,

        ""
    ];


    addExactDifferenceSection(
        discrepancyLines,
        "Exact Dutch-site differences",
        "nl-nl",
        "nl-be",
        dutchExact
    );


    addExactDifferenceSection(
        discrepancyLines,
        "Exact English-site differences",
        "en-nl",
        "en-gb",
        englishExact
    );


    discrepancyLines.push(

        "## Cross-language logical discrepancies",

        "",

        "| Logical page | en-nl | en-gb | nl-nl | nl-be | Missing |",

        "|---|---|---|---|---|---|"
    );


    if (
        !discrepancyRows.length
    ) {

        discrepancyLines.push(
            "| — | — | — | — | — | None |"
        );

    } else {

        for (
            const row
            of discrepancyRows
        ) {

            discrepancyLines.push(
                `| \`${row.key}\` ` +
                `| ${markdownUrl(row.sites["en-nl"])} ` +
                `| ${markdownUrl(row.sites["en-gb"])} ` +
                `| ${markdownUrl(row.sites["nl-nl"])} ` +
                `| ${markdownUrl(row.sites["nl-be"])} ` +
                `| ${row.missing.join(", ")} |`
            );
        }
    }


    discrepancyLines.push(
        "",
        "## Normalisation collisions",
        ""
    );


    if (
        !collisions.length
    ) {

        discrepancyLines.push(
            "No collisions detected."
        );

    } else {

        discrepancyLines.push(

            "A collision means two URLs on the same site were reduced to the same logical key. These should be reviewed before trusting that match.",

            ""
        );


        for (
            const collision
            of collisions
        ) {

            discrepancyLines.push(

                `### ${collision.siteId}: \`${collision.key}\``,

                ""
            );


            for (
                const url
                of collision.urls
            ) {

                discrepancyLines.push(
                    `- ${url}`
                );
            }


            discrepancyLines.push("");
        }
    }


    const discrepancyFile =
        path.join(
            outputFolder,
            "site-structure-discrepancies.md"
        );


    fs.writeFileSync(
        discrepancyFile,
        `${discrepancyLines.join("\n")}\n`,
        "utf8"
    );


    /*
     * --------------------------------
     * Full matrix
     * --------------------------------
     */

    const matrixLines = [

        "# DEKOM Site Structure Matrix",

        "",

        `Generated: ${new Date().toISOString()}`,

        "",

        `Comparison scope: ${scopeLabel}`,

        "",

        "| Logical page | en-nl | en-gb | nl-nl | nl-be | Status |",

        "|---|---|---|---|---|---|"
    ];


    for (
        const row
        of rows
    ) {

        const status =
            row.missing.length
                ? `Missing: ${row.missing.join(", ")}`
                : "Complete";


        matrixLines.push(
            `| \`${row.key}\` ` +
            `| ${markdownUrl(row.sites["en-nl"])} ` +
            `| ${markdownUrl(row.sites["en-gb"])} ` +
            `| ${markdownUrl(row.sites["nl-nl"])} ` +
            `| ${markdownUrl(row.sites["nl-be"])} ` +
            `| ${status} |`
        );
    }


    const matrixFile =
        path.join(
            outputFolder,
            "site-structure-matrix.md"
        );


    fs.writeFileSync(
        matrixFile,
        `${matrixLines.join("\n")}\n`,
        "utf8"
    );


    /*
     * --------------------------------
     * Machine-readable data
     * --------------------------------
     */

    const jsonFile =
        path.join(
            outputFolder,
            "site-structure-comparison.json"
        );


    fs.writeFileSync(
        jsonFile,
        JSON.stringify(
            {

                generated:
                    new Date().toISOString(),

                scope:
                    full
                        ? "full"
                        : "standard",

                sourceFile:
                    full
                        ? "urls-full.json"
                        : "urls-check.json",

                counts:
                    Object.fromEntries(
                        SITE_IDS.map(
                            siteId => [
                                siteId,
                                siteUrls[
                                    siteId
                                ].length
                            ]
                        )
                    ),

                summary: {

                    logicalPages:
                        rows.length,

                    complete:
                        completeRows.length,

                    discrepancies:
                        discrepancyRows.length,

                    collisions:
                        collisions.length
                },

                rows,

                collisions
            },
            null,
            2
        ),
        "utf8"
    );


    console.log("");

    console.log(
        `${scopeLabel} site structure comparison complete.`
    );


    for (
        const siteId
        of SITE_IDS
    ) {

        console.log(
            `${siteId}: ${siteUrls[siteId].length} URLs`
        );
    }


    console.log("");

    console.log(
        `Logical pages: ${rows.length}`
    );

    console.log(
        `Complete across all sites: ${completeRows.length}`
    );

    console.log(
        `Discrepancies: ${discrepancyRows.length}`
    );

    console.log(
        `Collisions: ${collisions.length}`
    );

    console.log("");

    console.log(
        `Discrepancy report: ${discrepancyFile}`
    );

    console.log(
        `Full matrix: ${matrixFile}`
    );

    console.log(
        `JSON data: ${jsonFile}`
    );
}


module.exports =
    compareSiteStructure;