const fs = require("fs");
const path = require("path");

const loadUrls = require("./loadUrls");
const filterUrls = require("./filterUrls");
const downloadPages = require("./downloadPages");
const extractText = require("./extractText");
const clearPageCache = require("./clearPageCache");

const scanDutch = require("./scanDutch");
const scanGerman = require("./scanGerman");

const { getSite } = require("../config/sites");


async function runAudit(
    siteId,
    options = {}
) {
    const site = getSite(siteId);

    const full =
        options.full === true;


    /*
     * --------------------------------
     * Paths
     * --------------------------------
     */

    const cacheDir = path.join(
        ".",
        "cache",
        site.id
    );

    const snapshotBaseDir = path.join(
        ".",
        "snapshots",
        site.id
    );

    const snapshotDir =
        full
            ? path.join(
                snapshotBaseDir,
                "full"
            )
            : snapshotBaseDir;

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


    fs.mkdirSync(
        cacheDir,
        {
            recursive: true
        }
    );

    fs.mkdirSync(
        snapshotDir,
        {
            recursive: true
        }
    );


    /*
     * --------------------------------
     * Load complete sitemap
     * --------------------------------
     */

    const allUrls =
        await loadUrls(
            site.sitemap
        );


    fs.writeFileSync(
        path.join(
            cacheDir,
            "urls-all.json"
        ),
        JSON.stringify(
            allUrls,
            null,
            2
        ),
        "utf8"
    );


    /*
     * --------------------------------
     * Select audit scope
     * --------------------------------
     */

    let selectedUrls;
    let selectedUrlFile;


    if (full) {

        selectedUrls =
            allUrls;

        selectedUrlFile =
            path.join(
                cacheDir,
                "urls-full.json"
            );

    } else {

        selectedUrls =
            filterUrls(
                allUrls,
                path.join(
                    ".",
                    "config",
                    site.id,
                    "filters.json"
                ),
                site.rootUrl
            );

        selectedUrlFile =
            path.join(
                cacheDir,
                "urls-check.json"
            );
    }


    fs.writeFileSync(
        selectedUrlFile,
        JSON.stringify(
            selectedUrls,
            null,
            2
        ),
        "utf8"
    );


    /*
     * --------------------------------
     * URL snapshot
     * --------------------------------
     */

    const date =
        new Date()
            .toISOString()
            .split("T")[0];


    fs.writeFileSync(
        path.join(
            snapshotDir,
            `urls-${date}.json`
        ),
        JSON.stringify(
            selectedUrls,
            null,
            2
        ),
        "utf8"
    );


    /*
     * --------------------------------
     * Audit information
     * --------------------------------
     */

    const scopeLabel =
        full
            ? "FULL"
            : "STANDARD";


    console.log("");

    console.log(
        `${site.id}: ${scopeLabel} audit`
    );

    console.log(
        `${site.id}: ${allUrls.length} URLs discovered; ` +
        `${selectedUrls.length} URLs selected.`
    );


    if (full) {
        console.log(
            `${site.id}: normal URL filters bypassed.`
        );
    }


    /*
     * --------------------------------
     * Download and extract
     * --------------------------------
     */

    clearPageCache(
        site.id
    );


    const coverage =
        await downloadPages(
            selectedUrls,
            site.id,
            { full }
        );


    // Export from raw full-cache HTML before language processing or synchronization.
    // Keep the language scan running so its own result remains independent.
    let catalogueError = null;
    if (full && ['nl-nl', 'nl-be', 'en-nl', 'en-gb'].includes(site.id)) {
        try {
            const result = require('./exportCatalogue').exportCatalogue(site.id);
            if (!result.complete) throw new Error('Incomplete catalogue export; see saved manifest. Latest baseline preserved.');
        } catch (error) {
            catalogueError = error;
            console.error('Catalogue export failed: ' + error.message);
        }
    }

    extractText(
        site.id
    );


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

            coverage
        }
    );


    /*
     * --------------------------------
     * Coverage summary
     * --------------------------------
     */

    console.log("");

    console.log(
        `Scan coverage: ` +
        `${coverage.downloaded}/${coverage.requested} ` +
        `pages downloaded`
    );


    if (coverage.failed) {

        console.log(
            `WARNING: ${coverage.failed} page` +
            `${coverage.failed === 1 ? "" : "s"} ` +
            `could not be downloaded.`
        );


        for (
            const failure
            of coverage.failures
        ) {

            const status =
                failure.status
                    ? `HTTP ${failure.status} - `
                    : "";


            console.log(
                `  ${status}${failure.url}`
            );
        }

    } else {

        console.log(
            "Download failures: 0"
        );
    }
    if (catalogueError) {
        console.error('Language scan finished; catalogue export incomplete: ' + catalogueError.message);
        // Resolve the runner so index.js still synchronizes the saved diagnostic report.
        process.exitCode = 2;
    }
}


module.exports = runAudit;