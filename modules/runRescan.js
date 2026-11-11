const fs = require("fs");
const path = require("path");

const scanDutch = require("./scanDutch");
const scanGerman = require("./scanGerman");

const { getSite } = require("../config/sites");


function loadJson(file) {
    return JSON.parse(
        fs.readFileSync(
            file,
            "utf8"
        )
    );
}


function loadExistingCoverage(reportFolder) {

    const candidates = [
        path.join(
            reportFolder,
            "report-visible.json"
        ),
        path.join(
            reportFolder,
            "report-hidden.json"
        )
    ];


    for (const file of candidates) {

        if (!fs.existsSync(file)) {
            continue;
        }


        const report =
            loadJson(file);


        if (report.coverage) {
            return report.coverage;
        }
    }


    return null;
}


async function runRescan(
    siteId,
    options = {}
) {

    const site =
        getSite(siteId);


    const full =
        options.full === true;


    /*
     * --------------------------------
     * Paths
     * --------------------------------
     */

    const cacheDir =
        path.join(
            ".",
            "cache",
            site.id
        );


    const selectedUrlFile =
        path.join(
            cacheDir,
            full
                ? "urls-full.json"
                : "urls-check.json"
        );


    const urlMapFile =
        path.join(
            cacheDir,
            "url-map.json"
        );


    const textDir =
        path.join(
            cacheDir,
            "text"
        );


    const reportFolder =
        full
            ? path.join(
                ".",
                "reports",
                site.id,
                "full"
            )
            : path.join(
                ".",
                "reports",
                site.id
            );


    /*
     * --------------------------------
     * Validate cached audit
     * --------------------------------
     */

    if (!fs.existsSync(selectedUrlFile)) {
        throw new Error(
            `Cached URL selection not found: ${selectedUrlFile}`
        );
    }


    if (!fs.existsSync(urlMapFile)) {
        throw new Error(
            `Cached URL map not found: ${urlMapFile}`
        );
    }


    if (!fs.existsSync(textDir)) {
        throw new Error(
            `Cached extracted text not found: ${textDir}`
        );
    }


    const selectedUrls =
        loadJson(selectedUrlFile);


    if (!Array.isArray(selectedUrls)) {
        throw new Error(
            `Invalid cached URL selection: ${selectedUrlFile}`
        );
    }


    const urlMap =
        loadJson(urlMapFile);


    /*
     * --------------------------------
     * Determine cached coverage
     * --------------------------------
     */

    const cachedUrls =
        new Set();


    const textFiles =
        fs.readdirSync(textDir)
            .filter(
                file =>
                    file.endsWith(
                        "-visible.txt"
                    )
            );


    for (const file of textFiles) {

        const hash =
            path.basename(
                file,
                "-visible.txt"
            );


        const url =
            urlMap[hash];


        if (url) {
            cachedUrls.add(url);
        }
    }


    const cachedSelectedUrls =
        selectedUrls.filter(
            url =>
                cachedUrls.has(url)
        );


    const cachedSelectedCount =
        cachedSelectedUrls.length;


    /*
     * Prefer existing report coverage when available.
     *
     * If no previous report exists, derive coverage directly
     * from the current cached text and selected URL list.
     */

    const previousCoverage =
        loadExistingCoverage(
            reportFolder
        );


    let coverage;


    if (
        previousCoverage &&
        previousCoverage.requested ===
            selectedUrls.length &&
        previousCoverage.downloaded ===
            cachedSelectedCount
    ) {

        coverage =
            previousCoverage;

    } else {

        const missingUrls =
            selectedUrls.filter(
                url =>
                    !cachedUrls.has(url)
            );


        coverage = {
            requested:
                selectedUrls.length,

            downloaded:
                cachedSelectedCount,

            failed:
                missingUrls.length,

            failures:
                missingUrls.map(
                    url => ({
                        url,
                        error:
                            "No cached extracted text available"
                    })
                )
        };
    }


    /*
     * --------------------------------
     * Rescan information
     * --------------------------------
     */

    const scopeLabel =
        full
            ? "FULL"
            : "STANDARD";


    console.log("");

    console.log(
        `${site.id}: ${scopeLabel} cached rescan`
    );


    console.log(
        `${site.id}: ${selectedUrls.length} URLs in audit scope; ` +
        `${cachedSelectedCount} cached pages available.`
    );


    console.log(
        `${site.id}: sitemap loading and page downloads skipped.`
    );


    if (coverage.failed > 0) {

        console.warn(
            `${site.id}: WARNING — ${coverage.failed} selected ` +
            `URL(s) have no cached extracted text.`
        );
    }


    /*
     * --------------------------------
     * Language scan
     * --------------------------------
     */

    const scan =
        site.scanner === "dutch"
            ? scanDutch
            : scanGerman;


    scan(
        site.id,
        reportFolder,
        {
            scope:
                full
                    ? "full"
                    : "standard",

            coverage,

            selectedUrls
        }
    );


    console.log("");

    console.log(
        `${site.id}: cached rescan complete.`
    );
}


module.exports = runRescan;