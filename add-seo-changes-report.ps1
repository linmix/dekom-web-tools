$ErrorActionPreference = "Stop"

$ProjectRoot = (Get-Location).Path
$Target = Join-Path $ProjectRoot "modules\updateSeoReview.js"

if (-not (Test-Path $Target)) {
    throw "Run this script from the DEKOM-web project root. Missing: $Target"
}

$PatchFile = Join-Path $env:TEMP "dekom-seo-changes-report-patch.js"

@'
const fs = require('fs');
const file = 'modules/updateSeoReview.js';
let s = fs.readFileSync(file, 'utf8');

if (s.includes('function buildLeaderChangesMarkdown({')) {
  console.log('changes.md support is already present; no patch applied.');
  process.exit(0);
}

const insertMarker = 'function buildFollowerIndexMarkdown({';
if (!s.includes(insertMarker)) throw new Error('Could not find buildFollowerIndexMarkdown insertion point.');

const fn = `function buildLeaderChangesMarkdown({
    siteId,
    state,
    currentPages,
    groups
}) {

    const lines = [];
    const actionableGroups = [];

    let pendingCount = 0;
    let mismatchCount = 0;
    let missingCount = 0;
    let affectedPageCount = 0;


    for (const group of groups) {

        const pages = [];


        for (const url of group.urls) {

            const record = state.pages[url];

            if (!record) {
                continue;
            }

            const currentPage = currentPages.get(
                getSiteRelativePath(url)
            );

            const components = [];


            for (const component of ["title", "description"]) {

                const decision = record[component];

                if (!decision) {
                    continue;
                }


                if (!currentPage) {

                    missingCount++;

                    components.push({
                        component,
                        status: "PAGE MISSING",
                        currentValue: null,
                        finalValue: decision.finalValue
                    });

                    continue;
                }


                const currentValue = getLiveValue(
                    currentPage,
                    component
                );

                const status = getImplementationStatus(
                    decision,
                    currentValue
                );


                if (status === "LIVE") {
                    continue;
                }

                if (status === "PENDING") {
                    pendingCount++;
                }

                if (status === "MISMATCH") {
                    mismatchCount++;
                }


                components.push({
                    component,
                    status,
                    currentValue,
                    finalValue: decision.finalValue
                });
            }


            if (components.length) {

                pages.push({
                    url,
                    label: record.label || url,
                    components
                });

                affectedPageCount++;
            }
        }


        if (pages.length) {
            actionableGroups.push({
                ...group,
                pages
            });
        }
    }


    lines.push(\`# SEO changes to implement — \${siteId}\`);
    lines.push("");


    if (!actionableGroups.length) {

        lines.push("No changes to implement.");
        lines.push("");

        return lines.join("\\n") + "\\n";
    }


    lines.push(
        \`Changes to implement: \${pendingCount} component\${pendingCount === 1 ? "" : "s"}\`
    );

    if (mismatchCount) {
        lines.push(
            \`Mismatches to inspect: \${mismatchCount}\`
        );
    }

    if (missingCount) {
        lines.push(
            \`Missing-page components to inspect: \${missingCount}\`
        );
    }

    lines.push(
        \`Affected pages: \${affectedPageCount}\`
    );

    lines.push("");


    for (const group of actionableGroups) {

        lines.push(
            \`## Batch \${group.displayNumber} — \${group.label}\`
        );

        lines.push("");


        for (const page of group.pages) {

            lines.push(
                \`### \${page.label}\`
            );

            lines.push("");

            lines.push(
                \`\\\`\${getSiteRelativePath(page.url)}\\\`\`
            );

            lines.push("");


            for (const item of page.components) {

                const heading =
                    item.component === "title"
                        ? "Title"
                        : "Description";


                if (item.status === "MISMATCH") {
                    lines.push(
                        "**MISMATCH — inspect before changing**"
                    );
                    lines.push("");
                }

                if (item.status === "PAGE MISSING") {
                    lines.push(
                        "**PAGE MISSING — inspect before changing**"
                    );
                    lines.push("");
                }


                lines.push(\`\${heading}:\`);
                lines.push("");
                lines.push(
                    markdownValue(item.finalValue)
                );
                lines.push("");


                if (item.status === "MISMATCH") {
                    lines.push(
                        \`Current \${item.component}:\`
                    );
                    lines.push("");
                    lines.push(
                        markdownValue(item.currentValue)
                    );
                    lines.push("");
                }
            }


            lines.push("---");
            lines.push("");
        }
    }


    return lines.join("\\n") + "\\n";
}


`;

s = s.replace(insertMarker, fn + insertMarker);

const writeOld = `    fs.writeFileSync(
        markdownFile,
        indexMarkdown,
        "utf8"
    );


    return {
        markdownFile,
        batchMarkdownDir,
        batchReportCount:
            groups.length
    };
`;

const writeNew = `    fs.writeFileSync(
        markdownFile,
        indexMarkdown,
        "utf8"
    );


    let changesMarkdownFile = null;


    if (siteId === leadingSite) {

        changesMarkdownFile = path.join(
            markdownDir,
            "changes.md"
        );

        const changesMarkdown =
            buildLeaderChangesMarkdown({
                siteId,
                state,
                currentPages,
                groups
            });

        fs.writeFileSync(
            changesMarkdownFile,
            changesMarkdown,
            "utf8"
        );
    }


    return {
        markdownFile,
        changesMarkdownFile,
        batchMarkdownDir,
        batchReportCount:
            groups.length
    };
`;

if (!s.includes(writeOld)) throw new Error('Could not find writeReviewReports return block.');
s = s.replace(writeOld, writeNew);

const updateOld = `        decisionsFile,
        markdownFile:
            reports.markdownFile
    };
`;

const updateNew = `        decisionsFile,
        markdownFile:
            reports.markdownFile,
        changesMarkdownFile:
            reports.changesMarkdownFile
    };
`;

if (!s.includes(updateOld)) throw new Error('Could not find updateSeoReview return block.');
s = s.replace(updateOld, updateNew);

const refreshOld = `        refreshed: true,
        markdownFile:
            reports.markdownFile,
        batchReportCount:
            reports.batchReportCount
    };
`;

const refreshNew = `        refreshed: true,
        markdownFile:
            reports.markdownFile,
        changesMarkdownFile:
            reports.changesMarkdownFile,
        batchReportCount:
            reports.batchReportCount
    };
`;

if (!s.includes(refreshOld)) throw new Error('Could not find refresh return block.');
s = s.replace(refreshOld, refreshNew);

fs.copyFileSync(file, file + '.bak-changes-report');
fs.writeFileSync(file, s, 'utf8');
console.log('Patched ' + file);
console.log('Backup: ' + file + '.bak-changes-report');

'@ | Set-Content -Path $PatchFile -Encoding UTF8

node $PatchFile

if ($LASTEXITCODE -ne 0) {
    throw "Patch failed."
}

node --check .\modules\updateSeoReview.js

if ($LASTEXITCODE -ne 0) {
    throw "Syntax check failed. Restore modules\updateSeoReview.js.bak-changes-report."
}

Write-Host ""
Write-Host "Patch applied successfully."
Write-Host "Generating the implementation queue from the current SEO index..."
Write-Host ""

node .\seo-scan.js nl-nl --existing

if ($LASTEXITCODE -ne 0) {
    throw "SEO scan failed after patching."
}

Write-Host ""
Write-Host "Generated report:"
Write-Host ".\SEO\nl-nl\review\changes.md"
