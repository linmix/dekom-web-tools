const path = require("path");

const {
    SITE_IDS,
    getSite
} = require("./config/sites");

const compareReports =
    require("./modules/compareReports");
const syncGdrive =
    require("./modules/syncGdrive");

    

function printHelp() {
    console.log("Usage:");
    console.log("  node compare-reports.js <site-id> [--full]");
    console.log("");
    console.log(
        "Compare the current language-audit report with the previous"
    );
    console.log(
        "archived scan of the same scope."
    );
    console.log("");
    console.log(
        "By default, standard filtered scans are compared:"
    );
    console.log(
        "  reports/<site-id>/"
    );
    console.log(
        "  reports/<site-id>/archive/"
    );
    console.log("");
    console.log("Options:");
    console.log(
        "  --full    Compare comprehensive full-site scans instead:"
    );
    console.log(
        "            reports/<site-id>/full/"
    );
    console.log(
        "            reports/<site-id>/full/archive/"
    );
    console.log("");
    console.log(
        "Standard and full-site histories are never compared with"
    );
    console.log(
        "each other."
    );
    console.log("");
    console.log("Available site IDs:");

    for (const siteId of SITE_IDS) {
        console.log(`  ${siteId}`);
    }

    console.log("");
    console.log("Examples:");
    console.log(
        "  node compare-reports.js nl-nl"
    );
    console.log(
        "  node compare-reports.js nl-nl --full"
    );
    console.log(
        "  node compare-reports.js en-gb"
    );
    console.log(
        "  node compare-reports.js en-gb --full"
    );
}


const args =
    process.argv.slice(2);


if (
    !args.length ||
    args.includes("--help") ||
    args.includes("-h")
) {

    printHelp();

    process.exitCode =
        args.length ? 0 : 1;

} else {

    const siteId =
        args.find(
            argument =>
                !argument.startsWith("-")
        );

    const full =
        args.includes("--full");

    const unknownFlags =
        args.filter(
            argument =>
                argument.startsWith("-") &&
                argument !== "--full"
        );


    if (!siteId) {

        console.error(
            "Site ID is required."
        );

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

            const site =
                getSite(siteId);


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


            const auditCommand =
                `node index.js ${site.id}` +
                (full ? " --full" : "");


            compareReports({
                siteId: site.id,
                languageLabel:
                    site.languageLabel,
                reportFolder,
                indexFile:
                    auditCommand
            });
            try {

                syncGdrive();

            } catch (error) {

                console.error(
                    `Google Drive sync failed: ${error.message}`
                );

                process.exitCode = 1;
            }

        } catch (error) {

            console.error(
                `Unable to compare reports for ${siteId}: ${error.message}`
            );

            console.log("");
            printHelp();

            process.exitCode = 1;
        }
    }
}