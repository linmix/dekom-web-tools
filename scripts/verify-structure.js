const fs = require("fs");
const path = require("path");
const {
    SITE_IDS,
    getSite
} = require("../config/sites");

const projectRoot =
    path.resolve(__dirname, "..");

let valid = true;


function requirePath(relativePath) {
    const fullPath =
        path.join(
            projectRoot,
            relativePath
        );

    if (!fs.existsSync(fullPath)) {
        console.error(
            `Missing ${relativePath}`
        );

        valid = false;
    }
}


/*
 * --------------------------------
 * Site-specific structure
 * --------------------------------
 */

for (const siteId of SITE_IDS) {

    const site =
        getSite(siteId);


    for (const relativePath of [
        path.join(
            "config",
            site.id,
            "filters.json"
        ),
        path.join(
            "cache",
            site.id
        ),
        path.join(
            "snapshots",
            site.id
        ),
        path.join(
            "reports",
            site.id
        )
    ]) {
        requirePath(relativePath);
    }


    if (
        site.id !== siteId ||
        !site.sitemap.includes(
            `/${siteId}/`
        )
    ) {
        console.error(
            `Invalid site configuration for ${siteId}`
        );

        valid = false;
    }
}


/*
 * --------------------------------
 * Shared operational files
 * --------------------------------
 */

for (const relativePath of [
    path.join(
        "config",
        "sites.json"
    ),
    path.join(
        "config",
        "site-structure-aliases.json"
    ),
    "dictionaries",
    "modules",
    "index.js",
    "compare-reports.js",
    "compare-sites.js"
]) {
    requirePath(relativePath);
}


/*
 * --------------------------------
 * Result
 * --------------------------------
 */

if (!valid) {
    process.exit(1);
}


console.log(
    `Audit structure is valid for: ${SITE_IDS.join(", ")}`
);