#!/usr/bin/env node

const runSeo = require("./modules/runSeo");
const syncGdrive =
    require("./modules/syncGdrive");


/*
 * ================================================================
 * DEKOM SEO SCAN
 * ================================================================
 *
 * Root-level command-line entry point for the SEO toolchain.
 *
 * Usage:
 *
 *   node .\seo-scan.js <site> --existing
 *   node .\seo-scan.js <site> --refresh
 *
 * Examples:
 *
 *   node .\seo-scan.js nl-nl --existing
 *   node .\seo-scan.js nl-be --existing
 *   node .\seo-scan.js en-nl --refresh
 *   node .\seo-scan.js en-gb --refresh
 *
 * Modes:
 *
 *   --existing
 *       Uses the existing filtered cache.
 *       Does not download pages.
 *       Does not run the language scanner.
 *
 *   --refresh
 *       Refreshes the filtered website cache first,
 *       then performs SEO extraction.
 *       Does not run the language scanner.
 *
 * ================================================================
 */


const VALID_SITES = [
    "nl-nl",
    "nl-be",
    "en-nl",
    "en-gb"
];


const VALID_MODES = [
    "--existing",
    "--refresh"
];


/*
 * ------------------------------------------------
 * Help
 * ------------------------------------------------
 */

function showHelp() {

    console.log(`
DEKOM SEO scan

Usage:

  node .\\seo-scan.js <site> --existing
  node .\\seo-scan.js <site> --refresh


Sites:

  nl-nl
  nl-be
  en-nl
  en-gb


Modes:

  --existing

      Use the current filtered website cache.

      No pages are downloaded.
      No language scan is performed.

      Use this when the existing cache is current enough
      and you only want to rebuild the SEO review data.


  --refresh

      Refresh the filtered website cache first.

      The SEO extraction is then rebuilt from the
      refreshed cached HTML.

      No language scan is performed.


Examples:

  node .\\seo-scan.js nl-be --existing

  node .\\seo-scan.js nl-nl --refresh

  node .\\seo-scan.js en-nl --existing

  node .\\seo-scan.js en-gb --refresh
`);
}


/*
 * ------------------------------------------------
 * Arguments
 * ------------------------------------------------
 */

const args =
    process.argv.slice(2);


if (
    args.includes("--help") ||
    args.includes("-h")
) {

    showHelp();

    process.exit(0);
}


if (
    args.length !== 2
) {

    console.error(
        "\nError: expected a site and a mode.\n"
    );

    showHelp();

    process.exit(1);
}


const siteId =
    args[0];


const mode =
    args[1];


/*
 * ------------------------------------------------
 * Validate site
 * ------------------------------------------------
 */

if (
    !VALID_SITES.includes(
        siteId
    )
) {

    console.error(
        `\nError: unknown site "${siteId}".\n`
    );

    console.error(
        `Valid sites: ${VALID_SITES.join(", ")}\n`
    );

    process.exit(1);
}


/*
 * ------------------------------------------------
 * Validate mode
 * ------------------------------------------------
 */

if (
    !VALID_MODES.includes(
        mode
    )
) {

    console.error(
        `\nError: unknown mode "${mode}".\n`
    );

    console.error(
        `Valid modes: ${VALID_MODES.join(", ")}\n`
    );

    process.exit(1);
}


/*
 * ------------------------------------------------
 * Run
 * ------------------------------------------------
 */

(async () => {

    try {

        const internalMode =
            mode.replace(/^--/, "");

        await runSeo(
            siteId,
            {
                mode: internalMode
            }
        );


        /*
         * Synchronize completed project state
         * to Google Drive.
         */

        syncGdrive();


    } catch (
        error
    ) {

        console.error(
            "\nSEO scan failed."
        );

        console.error(
            error &&
            error.stack
                ? error.stack
                : error
        );

        process.exit(1);
    }

})();

/* DEKOM_BATCH_PROGRESS_HOOK_START
 * Refresh four-site batch report after a successful SEO update.
 * A second Drive sync includes the newly generated overview.
 */
process.on('exit', function(code) {
  if (code !== 0) return;
  const cp = require('child_process'), p = require('path');
  try {
    cp.execFileSync(process.execPath,
      [p.join(__dirname, 'modules', 'generateBatchProgress.js')],
      {cwd:p.resolve(__dirname,'.'),stdio:'inherit'});
    const sync=p.join(__dirname,'.','scripts','sync-gdrive.ps1');
    if(require('fs').existsSync(sync)){
      cp.execFileSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',sync],{cwd:p.resolve(__dirname,'.'),stdio:'inherit'});
    }
  } catch(e) {
    console.error('WARNING: Batch progress generation/sync failed:', e.message);
  }
});
/* DEKOM_BATCH_PROGRESS_HOOK_END */

