const fs = require("fs");
const path = require("path");

const SITE_IDS = ["en-nl", "en-gb", "nl-nl", "nl-be"];

const sites =
    JSON.parse(
        fs.readFileSync(
            path.join(__dirname, "sites.json"),
            "utf8"
        )
    ).sites;

function validateSites() {

    for (const site of sites) {

        if (!SITE_IDS.includes(site.id)) {
            throw new Error(
                `Unknown site ID "${site.id}" in config/sites.json.`
            );
        }

        if (!site.reviewLeader) {
            throw new Error(
                `Missing reviewLeader for site "${site.id}" in config/sites.json.`
            );
        }

        if (!SITE_IDS.includes(site.reviewLeader)) {
            throw new Error(
                `Invalid reviewLeader "${site.reviewLeader}" for site "${site.id}" in config/sites.json.`
            );
        }

        const leaderExists =
            sites.some(
                candidate =>
                    candidate.id === site.reviewLeader
            );

        if (!leaderExists) {
            throw new Error(
                `reviewLeader "${site.reviewLeader}" for site "${site.id}" has no configuration in config/sites.json.`
            );
        }
    }
}

validateSites();

function getSite(siteId) {

    if (!SITE_IDS.includes(siteId)) {
        throw new Error(
            `Unknown site ID "${siteId}". Use one of: ${SITE_IDS.join(", ")}.`
        );
    }

    const site =
        sites.find(
            candidate =>
                candidate.id === siteId
        );

    if (!site) {
        throw new Error(
            `Missing configuration for site ID "${siteId}".`
        );
    }

    return site;
}

module.exports = {
    SITE_IDS,
    getSite
};