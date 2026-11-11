const fs = require("fs");
const path = require("path");
const { summariseReports } = require("./reportStats");
const archiveReport = require("./archiveReport");

const exportReportToMarkdown =
    require("./exportReportToMarkdown");

function loadJson(file) {
    return JSON.parse(fs.readFileSync(file, "utf8"));
}

function arrayOrEmpty(list) {
    return Array.isArray(list) ? list : [];
}

function addHit(map, rule, matched) {

    const key = `${rule}|${matched}`;

    map.set(key, {
        rule,
        matched
    });
}

function checkWords(words, dictionaries) {

    const {
        coreExact,
        coreStems,
        connectorExact,
        prefixExact,
        prefixStems,
        suffixes,
        uppercaseExactExceptions,
        exactExceptions
    } = dictionaries;


    const hits = {
        core: new Map(),
        connectors: new Map(),
        prefixes: new Map(),
        suffixes: new Map()
    };


    for (const originalWord of words) {

        /*
         * Ignore explicitly configured uppercase
         * abbreviations/acronyms before normalising case.
         *
         * Example:
         *   AUS = Australia abbreviation -> ignored
         *   aus = German word             -> detected
         */
        if (
            uppercaseExactExceptions.has(
                originalWord
            )
        ) {
            continue;
        }


        const word =
            originalWord.toLowerCase();

        if (exactExceptions.has(word)) {
            continue;
        }

        const isTechnicalToken =
            /[\p{N}_-]/u.test(originalWord);


        if (isTechnicalToken) {
            continue;
        }

        if (connectorExact.has(word)) {
            addHit(
                hits.connectors,
                word,
                word
            );
        }


        if (coreExact.has(word)) {
            addHit(
                hits.core,
                word,
                word
            );
        }


        for (const stem of coreStems) {

            if (word.startsWith(stem)) {
                addHit(
                    hits.core,
                    stem,
                    word
                );
            }

        }


        if (prefixExact.has(word)) {
            addHit(
                hits.prefixes,
                word,
                word
            );
        }


        for (const stem of prefixStems) {

            if (word.startsWith(stem)) {
                addHit(
                    hits.prefixes,
                    stem,
                    word
                );
            }

        }


        for (const suffix of suffixes) {

            if (word.endsWith(suffix)) {
                addHit(
                    hits.suffixes,
                    suffix,
                    word
                );
            }

        }

    }


    return {
        core: [...hits.core.values()],
        connectors: [...hits.connectors.values()],
        prefixes: [...hits.prefixes.values()],
        suffixes: [...hits.suffixes.values()]
    };
}


function scanGerman(
    language,
    reportFolder = `./reports/${language}`,
    auditContext = {}
) {


    const coreFile = loadJson("./dictionaries/de_core_vocab.json");
    const connectorFile = loadJson("./dictionaries/de_connectors.json");
    const prefixFile = loadJson("./dictionaries/de_prefixes.json");
    const suffixFile = loadJson("./dictionaries/de_suffixes.json");
    const exceptionFile = loadJson("./dictionaries/exceptions.json");


    const dictionaries = {

        coreExact: new Set(arrayOrEmpty(coreFile.exact)),
        coreStems: arrayOrEmpty(coreFile.stems),

        connectorExact: new Set(arrayOrEmpty(connectorFile.exact)),

        prefixExact: new Set(arrayOrEmpty(prefixFile.exact)),
        prefixStems: arrayOrEmpty(prefixFile.stems),

        suffixes: arrayOrEmpty(suffixFile.stems),

        uppercaseExactExceptions:
            new Set(
                arrayOrEmpty(
                    exceptionFile.uppercase_exact
                )
            ),

        exactExceptions:
            new Set(
                arrayOrEmpty(
                    exceptionFile.exact
                )
            )

    };


    const urlMap = loadJson(
        `./cache/${language}/url-map.json`
    );

    const input = `./cache/${language}/text`;

    const selectedUrlSet =
    Array.isArray(
        auditContext.selectedUrls
    )
        ? new Set(
            auditContext.selectedUrls
        )
        : null;

    if (!fs.existsSync(reportFolder)) {
        fs.mkdirSync(reportFolder, {
            recursive: true
        });
    }


    const visibleReportFile =
        path.join(reportFolder, "report-visible.json");

    const hiddenReportFile =
        path.join(reportFolder, "report-hidden.json");


    const reportFiles = [
        visibleReportFile,
        hiddenReportFile
    ];


    for (const file of reportFiles) {
        archiveReport(file, reportFolder);
    }



    const files = fs.readdirSync(input)
        .filter(file => file.endsWith("-visible.txt"));


    const visibleReport = [];
    const hiddenReport = [];



    for (const file of files) {


        const hash = path.basename(
            file,
            "-visible.txt"
        );


        const url = urlMap[hash];

        if (
                selectedUrlSet &&
                !selectedUrlSet.has(url)
            ) {
                continue;
            }


        const visibleText = fs.readFileSync(
            path.join(input, file),
            "utf8"
        );



        const hiddenFile = `${hash}-hidden.json`;


        const hiddenItems = fs.existsSync(
            path.join(input, hiddenFile)
        )
        ? JSON.parse(
            fs.readFileSync(
                path.join(input, hiddenFile),
                "utf8"
            )
        )
        : [];



        const visibleWords =
            visibleText.match(/[\p{L}\p{N}_-]+/gu) || [];



        const visibleMatches = checkWords(
            visibleWords,
            dictionaries
        );



        const hiddenMatches = [];


        for (const item of hiddenItems) {


            const words =
                (item.text || "")
                    .match(/[\p{L}\p{N}_-]+/gu) || [];



            const matches = checkWords(
                words,
                dictionaries
            );



            const hasMatches =
                matches.core.length ||
                matches.connectors.length ||
                matches.prefixes.length ||
                matches.suffixes.length;



            if (hasMatches) {

                hiddenMatches.push({
                    type: item.type,
                    source: item.source,
                    text: item.text,
                    matches
                });

            }

        }



        const hasVisible =
            visibleMatches.core.length ||
            visibleMatches.connectors.length ||
            visibleMatches.prefixes.length ||
            visibleMatches.suffixes.length;



        const hasHidden = hiddenMatches.length > 0;



        if (hasVisible) {

            visibleReport.push({
                url,
                hash,
                matches: visibleMatches
            });

        }



        if (hasHidden) {

            hiddenReport.push({
                url,
                hash,
                matches: hiddenMatches
            });

        }

    }



    function sortUrls(a, b) {

        return a.url.localeCompare(b.url);

    }



    visibleReport.sort(sortUrls);
    hiddenReport.sort(sortUrls);



    fs.writeFileSync(
        visibleReportFile,
        JSON.stringify(
            {
                generated: new Date().toISOString(),
                
                scope:
                    auditContext.scope ||
                    "standard",

                coverage:
                    auditContext.coverage ||
                    null,

                pages:
                    visibleReport
            },
            null,
            2
        )
    );



    fs.writeFileSync(
        hiddenReportFile,
        JSON.stringify(
            {
                generated:
                    new Date().toISOString(),

                scope:
                    auditContext.scope ||
                    "standard",

                coverage:
                    auditContext.coverage ||
                    null,

                pages:
                    hiddenReport
            },
            null,
            2
        )
    );

    const statistics = summariseReports(
        { pages: visibleReport },
        { pages: hiddenReport }
    );

    const markdownReportFile =
        path.join(reportFolder, "report.md");

    exportReportToMarkdown(
        visibleReportFile,
        hiddenReportFile,
        markdownReportFile
    );

    console.log(
        `German scan complete: ${visibleReport.length} visible pages flagged`
    );

    console.log(
        `German scan complete: ${hiddenReport.length} hidden pages flagged`
    );

    console.log(
        `German scan complete: ${statistics.hidden.elementOccurrences} hidden element occurrences`
    );

    console.log(
        `German scan complete: ${statistics.hidden.uniqueRemediationUnits} unique hidden remediation units`
    );

}


module.exports = scanGerman;
