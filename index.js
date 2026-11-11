const { SITE_IDS, getSite } = require("./config/sites");
const runAudit = require("./modules/runAudit");
const runRescan = require("./modules/runRescan");
const syncGdrive =
    require("./modules/syncGdrive");


function printHelp() {
    console.log("Usage:");
    console.log("  node index.js <site-id> [--full] [--rescan]");
    console.log("");
    console.log("Run a DEKOM language audit.");
    console.log("");
    console.log("By default, the audit uses the include/exclude rules in:");
    console.log("  config/<site-id>/filters.json");
    console.log("");
    console.log("Options:");
    console.log("  --full      Scan every URL supplied by the site's sitemap.");
    console.log("              The normal include/exclude filters are ignored.");
    console.log("              Full-scan reports and history are stored separately");
    console.log("              under reports/<site-id>/full/.");
    console.log("              Then refreshes the standard report from cached text.");
    console.log("              Google Drive sync runs once after both phases.");
    console.log("");
    console.log("  --rescan    Rerun the language scan using the existing cached");
    console.log("              extracted text. The sitemap is not loaded and pages");
    console.log("              are not downloaded again.");
    console.log("");
    console.log("Available site IDs:");

    for (const siteId of SITE_IDS) {
        console.log(`  ${siteId}`);
    }

    console.log("");
    console.log("Examples:");
    console.log("  node index.js nl-nl");
    console.log("  node index.js nl-nl --full");
    console.log("  node index.js nl-nl --rescan");
    console.log("  node index.js nl-nl --full --rescan");
    console.log("  node index.js en-gb");
    console.log("  node index.js en-gb --full");
}


const args = process.argv.slice(2);

if (
    !args.length ||
    args.includes("--help") ||
    args.includes("-h")
) {
    printHelp();
    process.exitCode = args.length ? 0 : 1;
} else {

    const siteId = args.find(
        argument => !argument.startsWith("-")
    );

    const full = args.includes("--full");
    const rescan = args.includes("--rescan");

    const unknownFlags = args.filter(
        argument =>
            argument.startsWith("-") &&
            argument !== "--full" &&
            argument !== "--rescan"
    );


    if (!siteId) {
        console.error("Site ID is required.");
        console.log("");
        printHelp();
        process.exitCode = 1;

    } else if (unknownFlags.length) {
        console.error(
            `Unknown option: ${unknownFlags.join(", ")}`
        );
        console.log("");
        printHelp();
        process.exitCode = 1;

    } else {

        try {
            getSite(siteId);

        // Keep explicit --rescan behaviour, including --full --rescan.
        // A normal --full run additionally refreshes the standard report.
        async function execute() {
            if (rescan) {
                await runRescan(siteId, { full });
            } else {
                await runAudit(siteId, { full });

                if (full) {
                    console.log(`\n${siteId}: refreshing standard report from cache...`);
                    await runRescan(siteId, { full: false });
                }
            }

            // Only the outer command synchronizes, once all work is complete.
            syncGdrive();
        }

        execute().catch(error => {
            console.error(
                `Audit workflow failed for ${siteId}: ${error.message}`
            );
            process.exitCode = 1;
        });

        } catch (error) {
            console.error(
                `Invalid site ID: ${siteId}`
            );

            console.log("");
            printHelp();

            process.exitCode = 1;
        }
    }
}