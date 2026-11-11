const axios = require("axios");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");


async function downloadPages(urls, language, options = {}) {

    if (!language) {
        throw new Error(
            "Language parameter missing in downloadPages()"
        );
    }


    const folder =
        `./cache/${language}/pages`;

    const urlMap = {};

    const failures = [];
    const receipt = {
        schema_version: 1, locale: language,
        scope: options.full === true ? 'full' : 'standard',
        started_at: new Date().toISOString(),
        selected_urls_sha256: crypto.createHash('sha256').update(JSON.stringify(urls)).digest('hex'),
        pages: []
    };
    // Mark the new scan before fetching: stale full receipts must not validate partial caches.
    const receiptFile = `./cache/${language}/download-receipt.json`;
    fs.mkdirSync(path.dirname(receiptFile), {recursive: true});
    fs.writeFileSync(receiptFile, JSON.stringify({...receipt, completed: false}, null, 2), 'utf8');


    if (!fs.existsSync(folder)) {
        fs.mkdirSync(
            folder,
            {
                recursive: true
            }
        );
    }


    for (
        const [index, url]
        of urls.entries()
    ) {

        try {

            const response =
                await axios.get(url);


            const filename =
                crypto
                    .createHash("md5")
                    .update(url)
                    .digest("hex");


            fs.writeFileSync(
                path.join(
                    folder,
                    `${filename}.html`
                ),
                response.data,
                "utf8"
            );


            // Register only after successful HTML write.
            urlMap[filename] = url;
            const savedBytes = fs.readFileSync(path.join(folder, `${filename}.html`));
            receipt.pages.push({
                url, hash: filename, fetched_at: new Date().toISOString(),
                status: response.status,
                final_url: response.request?.res?.responseUrl || response.request?._redirectable?._currentUrl || null,
                html_sha256: crypto.createHash('sha256').update(savedBytes).digest('hex')
            });
            console.log(
                `${index + 1}/${urls.length} saved`
            );


        } catch (error) {

            const status =
                error.response
                    ? error.response.status
                    : null;

            const message =
                error.response
                    ? error.response.statusText
                    : error.message;


            receipt.pages.push({url, status, final_url: null, fetched_at: null, error: message});
            failures.push({
                url,
                status,
                message
            });


            const statusText =
                status
                    ? ` [HTTP ${status}]`
                    : "";


            console.log(
                `FAILED${statusText}: ${url}`
            );
        }
    }


    fs.writeFileSync(
        `./cache/${language}/url-map.json`,
        JSON.stringify(
            urlMap,
            null,
            2
        ),
        "utf8"
    );


    fs.writeFileSync(receiptFile, JSON.stringify({...receipt, completed: true, finished_at: new Date().toISOString()}, null, 2), 'utf8');

    return {
        requested: urls.length,
        downloaded:
            Object.keys(urlMap).length,
        failed: failures.length,
        failures
    };
}


module.exports = downloadPages;