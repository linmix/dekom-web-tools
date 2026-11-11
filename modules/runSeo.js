const fs = require("fs");
const path = require("path");

const loadUrls = require("./loadUrls");
const filterUrls = require("./filterUrls");
const downloadPages = require("./downloadPages");
const clearPageCache = require("./clearPageCache");
const extractSeo = require("./extractSeo");
const buildSeoBatches = require("./buildSeoBatches");
const updateSeoReview = require("./updateSeoReview");

const { getSite } = require("../config/sites");


async function runSeo(
    siteId,
    options = {}
) {

    const site = getSite(siteId);

    const mode =
        options.mode || "existing";


    if (
        mode !== "existing" &&
        mode !== "refresh"
    ) {

        throw new Error(
            `Unknown SEO mode: ${mode}`
        );

    }


    const cacheDir =
        path.join(
            ".",
            "cache",
            site.id
        );

    const urlsAllFile =
        path.join(
            cacheDir,
            "urls-all.json"
        );

    const urlsCheckFile =
        path.join(
            cacheDir,
            "urls-check.json"
        );

    const urlMapFile =
        path.join(
            cacheDir,
            "url-map.json"
        );

    const pagesDir =
        path.join(
            cacheDir,
            "pages"
        );


    fs.mkdirSync(
        cacheDir,
        {
            recursive: true
        }
    );


    /*
     * --------------------------------
     * EXISTING CACHE
     * --------------------------------
     */

    if (mode === "existing") {

        console.log("");
        console.log(
            `${site.id}: Using existing SEO data.`
        );


        const requiredFiles = [
            urlsCheckFile,
            urlMapFile
        ];


        for (const file of requiredFiles) {

            if (!fs.existsSync(file)) {

                throw new Error(
                    `Required cache file missing: ${file}`
                );

            }

        }


        if (!fs.existsSync(pagesDir)) {

            throw new Error(
                `Cached page folder missing: ${pagesDir}`
            );

        }


        const reviewRefresh =
            updateSeoReview.refreshMarkdown(
                site.id
            );

        if (reviewRefresh.refreshed) {

            console.log("");
            console.log(
                `${site.id}: SEO review status refreshed.`
            );

        }

        return;
    }


    /*
     * --------------------------------
     * REFRESH CACHE
     * --------------------------------
     */

    console.log("");
    console.log(
        `${site.id}: Refreshing filtered website cache for SEO.`
    );


    /*
     * Load complete sitemap
     */

    const sitemapUrls =
        await loadUrls(
            site.sitemap
        );

    const seededUrls =
        Array.isArray(site.seoSeedPaths)
            ? site.seoSeedPaths.map(
                seedPath =>
                    `${site.rootUrl}${seedPath}`
            )
            : [];

    const allUrls =
        [
            ...new Set([
                ...sitemapUrls,
                ...seededUrls
            ])
        ];


    fs.writeFileSync(
        urlsAllFile,
        JSON.stringify(
            allUrls,
            null,
            2
        ),
        "utf8"
    );


    /*
     * Apply normal site filters.
     *
     * urls-check.json is authoritative
     * for SEO scope.
     */

    const selectedUrls =
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


    fs.writeFileSync(
        urlsCheckFile,
        JSON.stringify(
            selectedUrls,
            null,
            2
        ),
        "utf8"
    );


    console.log(
        `${site.id}: ${allUrls.length} URLs discovered; ` +
        `${selectedUrls.length} URLs selected for SEO.`
    );


    /*
     * Clear existing cached HTML before
     * downloading the current filtered set.
     */

    clearPageCache(
        site.id
    );


    /*
     * Download filtered pages.
     *
     * downloadPages() also rebuilds
     * cache/<site>/url-map.json.
     */

    const coverage =
        await downloadPages(
            selectedUrls,
            site.id
        );


    console.log("");
    console.log(
        `${site.id}: ${coverage.downloaded}/${coverage.requested} pages downloaded.`
    );


    if (coverage.failed) {

        console.warn(
            `${site.id}: ${coverage.failed} page download(s) failed.`
        );

    }


    /*
     * SEO extraction
     *
     * extractSeo.js reads:
     *
     *   cache/<site>/urls-check.json
     *   cache/<site>/url-map.json
     *   cache/<site>/pages/
     *
     * and writes derived output to:
     *
     *   SEO/<site>/
     */

    extractSeo(
        site.id
    );

    buildSeoBatches(
        site.id
    );

const reviewRefresh =
    updateSeoReview.refreshMarkdown(
        site.id
    );

if (reviewRefresh.refreshed) {

    console.log("");
    console.log(
        `${site.id}: SEO review status refreshed.`
    );

}

}

module.exports = runSeo;