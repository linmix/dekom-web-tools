#!/usr/bin/env node

const updateSeoReview =
    require(
        "./updateSeoReview"
    );

const syncGdrive =
    require(
        "./syncGdrive"
    );


const VALID_SITES = [
    "nl-nl",
    "nl-be",
    "en-nl",
    "en-gb"
];


function showHelp() {

    console.log(`
DEKOM SEO review state

Usage:

 PowerShell:
   $OutputEncoding = [System.Text.UTF8Encoding]::new($false)
   <JSON payload> | node .\modules\applySeoReview.js <site> --apply

Example:

  $OutputEncoding = [System.Text.UTF8Encoding]::new($false)

  @'
  {
    "pages": [
      {
        "url": "https://www.dekom.com/nl-nl/oplossingen/platform/zoom",
        "title": {
          "decision": "KEEP"
        }
      }
    ]
  }
'@ | node .\modules\applySeoReview.js nl-nl --apply

Valid decisions:

  KEEP
      Keep the current website value.

  ACCEPT
      Accept proposedValue as the final value.

  CUSTOM
      Use finalValue as the final editorial value.

Sites:

  nl-nl
  nl-be
  en-nl
  en-gb
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
        "\nError: expected a site and --apply.\n"
    );

    showHelp();

    process.exit(1);
}


const siteId =
    args[0];

const mode =
    args[1];


if (
    !VALID_SITES.includes(
        siteId
    )
) {

    console.error(
        `\nError: unknown site "${siteId}".\n`
    );

    process.exit(1);
}


if (
    mode !== "--apply"
) {

    console.error(
        `\nError: unknown mode "${mode}". Expected --apply.\n`
    );

    process.exit(1);
}


/*
 * ------------------------------------------------
 * Read stdin
 * ------------------------------------------------
 */

let input = "";


process.stdin.setEncoding(
    "utf8"
);


process.stdin.on(
    "data",
    chunk => {

        input += chunk;
    }
);


process.stdin.on(
    "end",
    () => {

        try {

            if (
                !input.trim()
            ) {

                throw new Error(
                    "No review payload received on stdin."
                );
            }


            const payload =
                JSON.parse(
                    input.replace(
                        /^\uFEFF/,
                        ""
                    )
                );


            const result =
                updateSeoReview(
                    siteId,
                    payload
                );


            console.log("");
            console.log(
                `${siteId}: SEO review state updated.`
            );

            console.log(
                `${result.pagesUpdated} page(s) updated.`
            );

            console.log(
                `${result.componentsUpdated} metadata component(s) updated.`
            );

            console.log(
                `${result.decisionCount} page(s) now have recorded editorial decisions.`
            );

            console.log("");
            console.log(
                `JSON: ${result.decisionsFile}`
            );

            console.log(
                `Markdown: ${result.markdownFile}`
            );


            syncGdrive();


        } catch (error) {

            console.error(
                "\nSEO review update failed."
            );

            console.error(
                error &&
                error.stack
                    ? error.stack
                    : error
            );

            process.exitCode = 1;
        }

    }
);

/* DEKOM_BATCH_PROGRESS_HOOK_START
 * Refresh four-site batch report after a successful SEO update.
 * A second Drive sync includes the newly generated overview.
 */
process.on('exit', function(code) {
  if (code !== 0) return;
  const cp = require('child_process'), p = require('path');
  try {
    cp.execFileSync(process.execPath,
      [p.join(__dirname, '.', 'generateBatchProgress.js')],
      {cwd:p.resolve(__dirname,'..'),stdio:'inherit'});
    const sync=p.join(__dirname,'..','scripts','sync-gdrive.ps1');
    if(require('fs').existsSync(sync)){
      cp.execFileSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',sync],{cwd:p.resolve(__dirname,'..'),stdio:'inherit'});
    }
  } catch(e) {
    console.error('WARNING: Batch progress generation/sync failed:', e.message);
  }
});
/* DEKOM_BATCH_PROGRESS_HOOK_END */

