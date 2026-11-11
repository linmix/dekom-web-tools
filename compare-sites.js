const compareSiteStructure =
    require("./modules/compareSiteStructure");
const syncGdrive =
    require("./modules/syncGdrive");


function printHelp() {
    console.log("Usage:");
    console.log("  node compare-sites.js [--full]");
    console.log("");
    console.log(
        "Compare equivalent page structures across all four DEKOM sites."
    );
    console.log("");
    console.log(
        "By default, compare the standard filtered audit selections:"
    );
    console.log(
        "  cache/<site-id>/urls-check.json"
    );
    console.log("");
    console.log("Options:");
    console.log(
        "  --full    Compare complete full-site URL selections instead:"
    );
    console.log(
        "            cache/<site-id>/urls-full.json"
    );
    console.log("");
    console.log(
        "Standard output:"
    );
    console.log(
        "  output/site-structure/"
    );
    console.log("");
    console.log(
        "Full-site output:"
    );
    console.log(
        "  output/site-structure/full/"
    );
}


const args =
    process.argv.slice(2);


if (
    args.includes("--help") ||
    args.includes("-h")
) {

    printHelp();

    process.exitCode = 0;

} else {

    const full =
        args.includes("--full");

    const unknownFlags =
        args.filter(
            argument =>
                argument.startsWith("-") &&
                argument !== "--full"
        );


    if (unknownFlags.length) {

        console.error(
            `Unknown option: ${unknownFlags.join(", ")}`
        );

        console.log("");
        printHelp();

        process.exitCode = 1;

    } else {

        try {

            compareSiteStructure({
                full
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
                `Site structure comparison failed: ${error.message}`
            );

            process.exitCode = 1;
        }
    }
}