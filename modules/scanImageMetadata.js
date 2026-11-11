const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");


function cleanText(value) {

    return (value || "")
        .replace(/\u00a0/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}


function stripQueryAndHash(value) {

    return (value || "")
        .split("#")[0]
        .split("?")[0];
}


function normalizeImagePath(src) {

    let value =
        stripQueryAndHash(
            cleanText(src)
        );


    if (!value) {
        return "";
    }


    if (
        value.startsWith("data:")
    ) {
        return "";
    }


    try {

        if (
            value.startsWith("http://") ||
            value.startsWith("https://")
        ) {

            const parsed =
                new URL(value);

            value =
                parsed.pathname;
        }

    } catch (error) {

        // Keep original value if URL parsing fails.
    }


    return value;
}


function getAssetInfo(src) {

    const normalized =
        normalizeImagePath(src);


    if (!normalized) {

        return {
            assetPath: "",
            assetId: null
        };
    }


    /*
     * Typical Pimcore rendition:
     *
     * /folder/13229/
     * image-thumb__13229__product-cover-image/
     * ctouch_neo_writing.jpg
     *
     * Actual asset:
     *
     * /folder/ctouch_neo_writing.jpg
     */

    const match =
        normalized.match(
            /^(.*)\/(\d+)\/image-thumb__\2__[^/]+\/([^/]+)$/
        );


    if (match) {

        const [
            ,
            parentPath,
            assetId,
            filename
        ] =
            match;


        return {
            assetPath:
                `${parentPath}/${filename}`,

            assetId:
                Number(assetId)
        };
    }


    /*
     * Fallback for unusual/non-Pimcore image paths.
     */

    return {
        assetPath:
            normalized,

        assetId:
            null
    };
}


function readableImagePath(value) {

    try {

        return decodeURIComponent(
            value
        );

    } catch (error) {

        return value;
    }
}


function loadFilteredHashes(
    urlsCheckFile,
    urlMapFile
) {

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


    const selectedUrlSet =
        new Set(
            selectedUrls
        );


    const filteredHashes =
        new Set();


    for (
        const [hash, url]
        of Object.entries(urlMap)
    ) {

        if (
            selectedUrlSet.has(url)
        ) {

            filteredHashes.add(
                hash
            );
        }
    }


    return {
        filteredHashes,
        selectedUrlCount:
            selectedUrls.length
    };
}


function renderImage(
    lines,
    image
) {

    lines.push(
        `## ${image.displayPath}`
    );

    lines.push("");


    if (
        image.alt.length
    ) {

        if (
            image.alt.length === 1
        ) {

            lines.push(
                `ALT: ${image.alt[0]}`
            );

        } else {

            lines.push(
                "ALT:"
            );


            for (
                const value
                of image.alt
            ) {

                lines.push(
                    `- ${value}`
                );
            }
        }


        lines.push("");
    }


    if (
        image.title.length
    ) {

        if (
            image.title.length === 1
        ) {

            lines.push(
                `TITLE: ${image.title[0]}`
            );

        } else {

            lines.push(
                "TITLE:"
            );


            for (
                const value
                of image.title
            ) {

                lines.push(
                    `- ${value}`
                );
            }
        }


        lines.push("");
    }
}


function renderMarkdown(
    filteredImages,
    otherImages
) {

    const lines = [];


    lines.push(
        "# Image metadata"
    );

    lines.push("");

    lines.push(
        `Filtered-page assets: ${filteredImages.length}`
    );

    lines.push(
        `Other cached-page assets: ${otherImages.length}`
    );

    lines.push(
        `Total unique assets with ALT or TITLE metadata: ` +
        `${filteredImages.length + otherImages.length}`
    );

    lines.push("");


    lines.push(
        "# FILTERED PAGES"
    );

    lines.push("");

    lines.push(
        "Images found on at least one page in urls-check.json."
    );

    lines.push("");


    if (!filteredImages.length) {

        lines.push(
            "No image metadata found in the filtered page set."
        );

        lines.push("");

    } else {

        for (
            const image
            of filteredImages
        ) {

            renderImage(
                lines,
                image
            );
        }
    }


    lines.push(
        "# OTHER CACHED PAGES"
    );

    lines.push("");

    lines.push(
        "Images found only on cached pages outside urls-check.json."
    );

    lines.push("");


    if (!otherImages.length) {

        lines.push(
            "No additional image metadata found."
        );

        lines.push("");

    } else {

        for (
            const image
            of otherImages
        ) {

            renderImage(
                lines,
                image
            );
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


function scanImageMetadata(siteId) {

    if (!siteId) {

        throw new Error(
            "Site ID missing in scanImageMetadata()"
        );
    }


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


    const reportDir =
        path.join(
            ".",
            "reports",
            siteId,
            "images"
        );


    const jsonFile =
        path.join(
            reportDir,
            "image-metadata.json"
        );


    const markdownFile =
        path.join(
            reportDir,
            "image-metadata.md"
        );


    if (!fs.existsSync(pageDir)) {

        throw new Error(
            `Page cache does not exist: ${pageDir}`
        );
    }


    if (!fs.existsSync(urlsCheckFile)) {

        throw new Error(
            `Filtered URL list does not exist: ${urlsCheckFile}`
        );
    }


    if (!fs.existsSync(urlMapFile)) {

        throw new Error(
            `URL map does not exist: ${urlMapFile}`
        );
    }


    fs.mkdirSync(
        reportDir,
        {
            recursive: true
        }
    );


    const {
        filteredHashes,
        selectedUrlCount
    } =
        loadFilteredHashes(
            urlsCheckFile,
            urlMapFile
        );


    const images =
        new Map();


    const files =
        fs
            .readdirSync(
                pageDir
            )
            .filter(
                file =>
                    file.endsWith(".html")
            );


    for (
        const file
        of files
    ) {

        const hash =
            file.replace(
                /\.html$/,
                ""
            );


        const isFilteredPage =
            filteredHashes.has(
                hash
            );


        const html =
            fs.readFileSync(
                path.join(
                    pageDir,
                    file
                ),
                "utf8"
            );


        const $ =
            cheerio.load(
                html
            );


        $("img").each(
            function () {

                const source =
                    $(this).attr("src");


                const {
                    assetPath,
                    assetId
                } =
                    getAssetInfo(
                        source
                    );


                if (!assetPath) {
                    return;
                }


                const alt =
                    cleanText(
                        $(this).attr("alt")
                    );


                const title =
                    cleanText(
                        $(this).attr("title")
                    );


                if (
                    !alt &&
                    !title
                ) {
                    return;
                }


                if (
                    !images.has(
                        assetPath
                    )
                ) {

                    images.set(
                        assetPath,
                        {
                            sourcePath:
                                assetPath,

                            displayPath:
                                readableImagePath(
                                    assetPath
                                ),

                            assetId,

                            alt:
                                new Set(),

                            title:
                                new Set(),

                            filtered:
                                false
                        }
                    );
                }


                const image =
                    images.get(
                        assetPath
                    );


                /*
                 * In case the first occurrence did not expose
                 * the Pimcore asset ID but a later one does.
                 */

                if (
                    !image.assetId &&
                    assetId
                ) {

                    image.assetId =
                        assetId;
                }


                if (
                    isFilteredPage
                ) {

                    image.filtered =
                        true;
                }


                if (alt) {

                    image.alt.add(
                        alt
                    );
                }


                if (title) {

                    image.title.add(
                        title
                    );
                }

            }
        );
    }


    const allImages =
        [...images.values()]
            .map(
                image => ({

                    sourcePath:
                        image.sourcePath,

                    displayPath:
                        image.displayPath,

                    assetId:
                        image.assetId,

                    filtered:
                        image.filtered,

                    alt:
                        [...image.alt],

                    title:
                        [...image.title]
                })
            )
            .sort(
                (a, b) =>
                    a.displayPath.localeCompare(
                        b.displayPath
                    )
            );


    const filteredImages =
        allImages.filter(
            image =>
                image.filtered
        );


    const otherImages =
        allImages.filter(
            image =>
                !image.filtered
        );


    const jsonOutput = {

        siteId,

        summary: {
            pagesCached:
                files.length,

            pagesInFilteredScope:
                selectedUrlCount,

            filteredAssets:
                filteredImages.length,

            otherAssets:
                otherImages.length,

            totalAssets:
                allImages.length
        },

        filtered:
            filteredImages,

        other:
            otherImages
    };


    fs.writeFileSync(
        jsonFile,
        JSON.stringify(
            jsonOutput,
            null,
            2
        ),
        "utf8"
    );


    fs.writeFileSync(
        markdownFile,
        renderMarkdown(
            filteredImages,
            otherImages
        ),
        "utf8"
    );


    console.log("");

    console.log(
        `${siteId}: image metadata scan complete`
    );

    console.log(
        `${files.length} cached pages scanned`
    );

    console.log(
        `${selectedUrlCount} URLs in filtered scope`
    );

    console.log(
        `${filteredImages.length} unique assets on filtered pages`
    );

    console.log(
        `${otherImages.length} unique assets only on other pages`
    );

    console.log(
        `${allImages.length} total unique assets with ALT or TITLE metadata`
    );

    console.log("");

    console.log(
        `Markdown: ${markdownFile}`
    );

    console.log(
        `JSON: ${jsonFile}`
    );


    return {
        siteId,

        pagesScanned:
            files.length,

        filteredAssets:
            filteredImages.length,

        otherAssets:
            otherImages.length,

        totalAssets:
            allImages.length,

        markdownFile,

        jsonFile
    };
}


module.exports =
    scanImageMetadata;