const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");


const DOWNLOAD_EXTENSIONS = new Set([
    ".pdf",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".ppt",
    ".pptx",
    ".zip"
]);


function normalizeDownloadLabel(value) {

    if (!value) {
        return "";
    }


    let normalized = value;


    try {
        normalized = decodeURIComponent(normalized);
    } catch {
        // Keep the original value if URL decoding fails.
    }


    return normalized
        .replace(/\.[a-z0-9]+$/i, "")
        .replace(/[^a-z0-9]+/gi, " ")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();

}


function isDisplayedDownloadFilename($, element) {

    const href = ($(element).attr("href") || "").trim();

    if (!href) {
        return false;
    }


    let pathname = href;


    try {
        pathname = new URL(href, "https://www.dekom.com").pathname;
    } catch {
        pathname = href.split(/[?#]/, 1)[0];
    }


    let filename = path.posix.basename(pathname);


    try {
        filename = decodeURIComponent(filename);
    } catch {
        // Keep the encoded filename if URL decoding fails.
    }


    const extension = path.extname(filename).toLowerCase();

    if (!DOWNLOAD_EXTENSIONS.has(extension)) {
        return false;
    }


    const label = $(element).text().trim();

    if (!label) {
        return false;
    }


    return normalizeDownloadLabel(label) === normalizeDownloadLabel(filename);

}


function extractText(language) {

    if (!language) {
        throw new Error("Language parameter missing in extractText()");
    }


    const input = `./cache/${language}/pages`;
    const output = `./cache/${language}/text`;


    if (!fs.existsSync(input)) {
        throw new Error(`Input folder does not exist: ${input}`);
    }


    if (!fs.existsSync(output)) {
        fs.mkdirSync(output, {
            recursive: true
        });
    }


    const files = fs.readdirSync(input);


    for (const file of files) {


        const html = fs.readFileSync(
            path.join(input, file),
            "utf8"
        );


        const $ = cheerio.load(html);


        $("script, style, nav, footer").remove();
        $(".product-label").remove();



        // Remove displayed filenames for downloadable assets from visible-text scanning.
        // Descriptive download labels remain in place and are still scanned.
        $("a[href]").each(function () {

            if (isDisplayedDownloadFilename($, this)) {
                $(this).remove();
            }

        });



        // Visible page text
        const visibleText = $("body")
            .find("*")
            .contents()
            .filter(function () {
                return this.type === "text";
            })
            .map(function () {
                return $(this).text() + " ";
            })
            .get()
            .join("")
            .replace(/\s+/g, " ")
            .trim();



        // Hidden/indexable text sources
        const hiddenItems = [];



        $("[title]:not(img)").each(function () {

            const title = ($(this).attr("title") || "").trim();

            if (title) {

                hiddenItems.push({
                    type: "title",
                    source: "",
                    text: title
                });

            }

        });



        $("[aria-label]:not(img)").each(function () {

            const label = ($(this).attr("aria-label") || "").trim();

            if (label) {

                hiddenItems.push({
                    type: "aria-label",
                    source: "",
                    text: label
                });

            }

        });



        const hash = file.replace(".html", "");



        fs.writeFileSync(
            path.join(output, `${hash}-visible.txt`),
            visibleText,
            "utf8"
        );


        fs.writeFileSync(
            path.join(output, `${hash}-hidden.json`),
            JSON.stringify(hiddenItems, null, 2),
            "utf8"
        );

    }


    console.log(
        `Extracted ${files.length} pages into ${language} visible/hidden text`
    );

}


module.exports = extractText;