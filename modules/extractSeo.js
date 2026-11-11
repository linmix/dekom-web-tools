const fs = require("fs");
const { fingerprint: fingerprintContent } = require("./seoContentFingerprint");
const path = require("path");
const cheerio = require("cheerio");


function cleanText(value) {
    return (value || "")
        .replace(/\u00a0/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}


function normalizeEditableTitle(publishedTitle) {
    return cleanText(
        publishedTitle.replace(
            /\s*·\s*DEKOM\s*$/i,
            ""
        )
    );
}


function makeReadableFilename(url) {

    const parsed = new URL(url);

    const parts = parsed.pathname
        .split("/")
        .filter(Boolean)
        .slice(1); // remove site ID such as nl-be / en-nl


    if (!parts.length) {
        return "home";
    }


    return parts
        .map(part => {

            const decoded =
                decodeURIComponent(part);

            return decoded
                .replace(/[^a-zA-Z0-9_-]+/g, "-")
                .replace(/-+/g, "-")
                .replace(/^-|-$/g, "");

        })
        .filter(Boolean)
        .join("__");
}


function clearDirectory(folder) {

    if (fs.existsSync(folder)) {

        fs.rmSync(
            folder,
            {
                recursive: true,
                force: true
            }
        );

    }


    fs.mkdirSync(
        folder,
        {
            recursive: true
        }
    );
}


function extractLinks($, element) {

    const links = [];


    $(element)
        .find("a[href]")
        .each(function () {

            const text =
                cleanText(
                    $(this).text()
                );

            const href =
                cleanText(
                    $(this).attr("href")
                );


            if (text && href) {

                links.push({
                    text,
                    href
                });

            }

        });


    return links;
}


function isCta($, element) {

    const node =
        $(element);

    const classes =
        node.attr("class") || "";

    const role =
        node.attr("role") || "";


    return (
        /button|cta|mdc-button/i.test(classes) ||
        role === "button"
    );
}


function extractContentBlocks($, root) {

    const blocks = [];


    function walk(element) {

        if (
            !element ||
            element.type !== "tag"
        ) {
            return;
        }


        const tag =
            (element.name || "")
                .toLowerCase();

        const node =
            $(element);


        /*
         * --------------------------------
         * Ignore non-editorial elements
         * --------------------------------
         */

        if (
            [
                "script",
                "style",
                "noscript",
                "svg",
                "nav",
                "footer"
            ].includes(tag)
        ) {
            return;
        }


        /*
         * --------------------------------
         * Headings
         * --------------------------------
         */

        if (/^h[1-6]$/.test(tag)) {

            const text =
                cleanText(
                    node.text()
                );


            if (text) {

                blocks.push({
                    type: "heading",
                    level:
                        Number(
                            tag.substring(1)
                        ),
                    text
                });

            }


            return;
        }


        /*
         * --------------------------------
         * Paragraphs
         * --------------------------------
         */

        if (tag === "p") {

            const text =
                cleanText(
                    node.text()
                );


            if (text) {

                blocks.push({
                    type: "paragraph",
                    text,
                    links:
                        extractLinks(
                            $,
                            element
                        )
                });

            }


            return;
        }


        /*
         * --------------------------------
         * Lists
         * --------------------------------
         */

        if (
            tag === "ul" ||
            tag === "ol"
        ) {

            const items = [];


            node
                .children("li")
                .each(function () {

                    const text =
                        cleanText(
                            $(this).text()
                        );


                    if (!text) {
                        return;
                    }


                    items.push({
                        text,
                        links:
                            extractLinks(
                                $,
                                this
                            )
                    });

                });


            if (items.length) {

                blocks.push({
                    type: "list",
                    ordered:
                        tag === "ol",
                    items
                });

            }


            return;
        }


        /*
         * --------------------------------
         * Standalone CTA links
         * --------------------------------
         */

        if (tag === "a") {

            const text =
                cleanText(
                    node.text()
                );

            const href =
                cleanText(
                    node.attr("href")
                );


            if (
                text &&
                href &&
                isCta(
                    $,
                    element
                )
            ) {

                blocks.push({
                    type: "cta",
                    text,
                    href
                });

            }


            return;
        }


        /*
         * --------------------------------
         * Containers
         * --------------------------------
         */

        for (
            const child
            of element.children || []
        ) {

            walk(child);

        }
    }


    root
        .children()
        .each(function () {

            walk(this);

        });


    return blocks;
}


function renderMarkdown(page) {

    const lines = [];


    lines.push(
        `# ${page.identity.label}`
    );

    lines.push("");

    lines.push(
        `URL: ${page.identity.url}`
    );

    lines.push(
        `Site: ${page.identity.siteId}`
    );


    if (
        page.hierarchy
            .breadcrumbs
            .length
    ) {

        lines.push(
            `Breadcrumb: ` +
            page.hierarchy
                .breadcrumbs
                .join(" > ")
        );

    }


    lines.push("");

    lines.push(
        "## Current SEO metadata"
    );

    lines.push("");

    lines.push(
        `Published title: ${page.seo.publishedTitle}`
    );

    lines.push(
        `Editable title: ${page.seo.editableTitle}`
    );

    lines.push(
        `Title length: ${page.seo.titleLength}`
    );

    lines.push(
        `Description: ${page.seo.description}`
    );

    lines.push(
        `Description length: ${page.seo.descriptionLength}`
    );


    if (page.seo.canonical) {

        lines.push(
            `Canonical: ${page.seo.canonical}`
        );

    }


    lines.push("");

    lines.push(
        "## Page content"
    );

    lines.push("");


    for (
        const block
        of page.content
    ) {

        if (
            block.type === "heading"
        ) {

            lines.push(
                `${"#".repeat(block.level)} ${block.text}`
            );

            lines.push("");

            continue;
        }


        if (
            block.type === "paragraph"
        ) {

            lines.push(
                block.text
            );

            lines.push("");

            continue;
        }


        if (
            block.type === "list"
        ) {

            block.items.forEach(
                (item, index) => {

                    const marker =
                        block.ordered
                            ? `${index + 1}.`
                            : "-";


                    lines.push(
                        `${marker} ${item.text}`
                    );

                }
            );


            lines.push("");

            continue;
        }


        if (
            block.type === "cta"
        ) {

            lines.push(
                `[CTA: ${block.text}](${block.href})`
            );

            lines.push("");

            continue;
        }

    }


    return lines
        .join("\n")
        .replace(
            /\n{3,}/g,
            "\n\n"
        )
        .trim() + "\n";
}


function extractSeo(siteId) {

    if (!siteId) {

        throw new Error(
            "Site ID missing in extractSeo()"
        );

    }


    /*
     * --------------------------------
     * Paths
     * --------------------------------
     */

    const cacheDir =
        path.join(
            ".",
            "cache",
            siteId
        );


    const pageDir =
        path.join(
            cacheDir,
            "pages"
        );


    const urlsCheckFile =
        path.join(
            cacheDir,
            "urls-check.json"
        );


    const urlMapFile =
        path.join(
            cacheDir,
            "url-map.json"
        );


    const seoDir =
        path.join(
            ".",
            "SEO",
            siteId
        );


    const jsonDir =
        path.join(
            seoDir,
            "pages"
        );


    const markdownDir =
        path.join(
            seoDir,
            "markdown"
        );


    /*
     * --------------------------------
     * Required input validation
     * --------------------------------
     */

    if (!fs.existsSync(pageDir)) {

        throw new Error(
            `Page cache does not exist: ${pageDir}`
        );

    }


    if (!fs.existsSync(urlsCheckFile)) {

        throw new Error(
            `SEO scope file does not exist: ${urlsCheckFile}`
        );

    }


    if (!fs.existsSync(urlMapFile)) {

        throw new Error(
            `URL map does not exist: ${urlMapFile}`
        );

    }


    /*
     * --------------------------------
     * Clear disposable SEO extraction
     * --------------------------------
     */

    clearDirectory(
        jsonDir
    );


    clearDirectory(
        markdownDir
    );


    /*
     * --------------------------------
     * Load SEO scope
     * --------------------------------
     */

    const selectedUrls =
        JSON.parse(
            fs.readFileSync(
                urlsCheckFile,
                "utf8"
            )
        );


    const urlMap =
        JSON.parse(
            fs.readFileSync(
                urlMapFile,
                "utf8"
            )
        );


    /*
     * --------------------------------
     * Reverse map:
     * URL -> hash
     * --------------------------------
     */

    const hashByUrl = {};


    for (
        const [
            hash,
            url
        ]
        of Object.entries(urlMap)
    ) {

        hashByUrl[url] =
            hash;

    }


    /*
     * --------------------------------
     * Extract selected pages only
     * --------------------------------
     */

    const pages = [];

    const failures = [];


    for (
        const [
            index,
            url
        ]
        of selectedUrls.entries()
    ) {

        const hash =
            hashByUrl[url];


        if (!hash) {

            failures.push({
                url,
                type: "missing-url-map"
            });


            console.log(
                `SEO WARNING: no URL mapping for ${url}`
            );


            continue;
        }


        const htmlFile =
            path.join(
                pageDir,
                `${hash}.html`
            );


        if (!fs.existsSync(htmlFile)) {

            failures.push({
                url,
                hash,
                type: "missing-html"
            });


            console.log(
                `SEO WARNING: cached HTML missing for ${url}`
            );


            continue;
        }


        const html =
            fs.readFileSync(
                htmlFile,
                "utf8"
            );


        const $ =
            cheerio.load(html);


        /*
         * --------------------------------
         * SEO metadata
         * --------------------------------
         */

        const publishedTitle =
            cleanText(
                $("head > title")
                    .first()
                    .text()
            );


        const editableTitle =
            normalizeEditableTitle(
                publishedTitle
            );


        const description =
            cleanText(
                $('meta[name="description"]')
                    .first()
                    .attr("content")
            );


        const canonical =
            cleanText(
                $('link[rel="canonical"]')
                    .first()
                    .attr("href")
            );


        /*
         * --------------------------------
         * Breadcrumb hierarchy
         * --------------------------------
         */

        const breadcrumbs = [];


        $(".breadcrumbs__item")
            .each(function () {

                const text =
                    cleanText(
                        $(this).text()
                    );


                if (
                    text &&
                    !breadcrumbs.includes(text)
                ) {

                    breadcrumbs.push(
                        text
                    );

                }

            });


        /*
         * --------------------------------
         * Main editorial content
         * --------------------------------
         */

        let root =
            $("#site");


        if (!root.length) {

            root =
                $("main");

        }


        if (!root.length) {

            root =
                $("body");

        }


        const content =
            extractContentBlocks(
                $,
                root
            );


        const h1 =
            content.find(
                block =>
                    block.type === "heading" &&
                    block.level === 1
            );


        const filename =
            makeReadableFilename(
                url
            );


        const page = {

            identity: {
                siteId,
                hash,
                url,
                filename,
                label:
                    h1
                        ? h1.text
                        : filename
            },

            hierarchy: {
                breadcrumbs,

                depth:
                    new URL(url)
                        .pathname
                        .split("/")
                        .filter(Boolean)
                        .length - 1
            },

            seo: {
                publishedTitle,
                editableTitle,

                titleLength:
                    editableTitle.length,

                description,

                descriptionLength:
                    description.length,

                canonical,

                missingTitle:
                    !editableTitle,

                missingDescription:
                    !description
            },

            contentFingerprint: fingerprintContent(content),
            content
        };


        pages.push(
            page
        );


        /*
         * --------------------------------
         * Write structured JSON
         * --------------------------------
         */

        fs.writeFileSync(
            path.join(
                jsonDir,
                `${filename}.json`
            ),
            JSON.stringify(
                page,
                null,
                2
            ),
            "utf8"
        );


        /*
         * --------------------------------
         * Write readable Markdown
         * --------------------------------
         */

        fs.writeFileSync(
            path.join(
                markdownDir,
                `${filename}.md`
            ),
            renderMarkdown(
                page
            ),
            "utf8"
        );


        console.log(
            `${index + 1}/${selectedUrls.length} SEO extracted`
        );

    }


    /*
     * --------------------------------
     * SEO inventory
     * --------------------------------
     */

    const inventory =
        pages.map(
            page => ({

                siteId:
                    page.identity.siteId,

                url:
                    page.identity.url,

                filename:
                    page.identity.filename,

                contentFingerprint: page.contentFingerprint,

                breadcrumbs:
                    page.hierarchy.breadcrumbs,

                depth:
                    page.hierarchy.depth,

                publishedTitle:
                    page.seo.publishedTitle,

                editableTitle:
                    page.seo.editableTitle,

                titleLength:
                    page.seo.titleLength,

                description:
                    page.seo.description,

                descriptionLength:
                    page.seo.descriptionLength,

                missingTitle:
                    page.seo.missingTitle,

                missingDescription:
                    page.seo.missingDescription
            })
        );


    fs.writeFileSync(
        path.join(
            seoDir,
            "index.json"
        ),
        JSON.stringify(
            inventory,
            null,
            2
        ),
        "utf8"
    );


    /*
     * --------------------------------
     * Extraction summary
     * --------------------------------
     */

    const summary = {
        siteId,

        requested:
            selectedUrls.length,

        extracted:
            pages.length,

        failed:
            failures.length,

        failures
    };


    fs.writeFileSync(
        path.join(
            seoDir,
            "summary.json"
        ),
        JSON.stringify(
            summary,
            null,
            2
        ),
        "utf8"
    );


    console.log("");

    console.log(
        `${siteId}: SEO extraction complete`
    );

    console.log(
        `${pages.length}/${selectedUrls.length} pages extracted`
    );


    if (failures.length) {

        console.log(
            `WARNING: ${failures.length} SEO page` +
            `${failures.length === 1 ? "" : "s"} could not be extracted`
        );

    }


    return summary;
}


module.exports = extractSeo;
