const scanImageMetadata =
    require("./modules/scanImageMetadata");

const syncGdrive =
    require("./modules/syncGdrive");


const validSites = [
    "en-nl",
    "en-gb",
    "nl-nl",
    "nl-be"
];


function showHelp() {

    console.log("");
    console.log("DEKOM image metadata scanner");
    console.log("");
    console.log(
        "Scans cached website pages for image ALT and TITLE metadata."
    );
    console.log(
        "Images are deduplicated by asset path."
    );
    console.log("");
    console.log("Usage:");
    console.log(
        "  node scan-image-metadata.js <site-id>"
    );
    console.log("");
    console.log("Valid site IDs:");
    console.log(
        `  ${validSites.join(", ")}`
    );
    console.log("");
    console.log("Example:");
    console.log(
        "  node scan-image-metadata.js nl-nl"
    );
    console.log("");
}


const argument =
    process.argv[2];


/*
 * --------------------------------
 * Help
 * --------------------------------
 */

if (
    argument === "--help" ||
    argument === "-h"
) {

    showHelp();

    process.exit(0);
}


/*
 * --------------------------------
 * Missing site ID
 * --------------------------------
 */

if (!argument) {

    console.error("");
    console.error(
        "ERROR: Site ID missing."
    );

    showHelp();

    process.exit(1);
}


/*
 * --------------------------------
 * Validate site ID
 * --------------------------------
 */

if (
    !validSites.includes(argument)
) {

    console.error("");
    console.error(
        `ERROR: Unknown site ID: ${argument}`
    );

    console.error(
        `Valid site IDs: ${validSites.join(", ")}`
    );

    console.error("");
    console.error(
        "Run with --help for usage information."
    );

    process.exit(1);
}


/*
 * --------------------------------
 * Run scan
 * --------------------------------
 */

try {

    scanImageMetadata(
        argument
    );


    try {

        syncGdrive();

    } catch (error) {

        console.error(
            `\nGoogle Drive sync failed: ${error.message}`
        );

        process.exitCode = 1;
    }

} catch (error) {

    console.error("");
    console.error(
        `Image metadata scan failed: ${error.message}`
    );

    process.exit(1);
}