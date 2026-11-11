const fs = require("fs");

function filterUrls(urls, filterFile, rootUrl) {
    const filters = JSON.parse(
        fs.readFileSync(filterFile, "utf8")
    );
    const include = Array.isArray(filters.include) ? filters.include : [];
    const exclude = Array.isArray(filters.exclude) ? filters.exclude : [];

    return urls.filter(url => {

        // Exclude first
        if (
            exclude.some(rule => url.startsWith(rule))
        ) {
            return false;
        }

        // Exact root page only
        if (url === rootUrl) {
            return true;
        }

        // Other includes
        if (
            include
                .filter(rule => rule !== rootUrl)
                .some(rule => url.startsWith(rule))
        ) {
            return true;
        }

        return false;
    });
}

module.exports = filterUrls;
