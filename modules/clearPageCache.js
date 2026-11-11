const fs = require("fs");
const path = require("path");

function clearFolder(folder) {

    if (!fs.existsSync(folder)) {

        fs.mkdirSync(folder, {
            recursive: true
        });

        return;
    }

    const entries = fs.readdirSync(folder);

    for (const entry of entries) {

        const fullPath = path.join(
            folder,
            entry
        );

        const stat = fs.lstatSync(fullPath);

        if (stat.isDirectory()) {

            fs.rmSync(fullPath, {
                recursive: true,
                force: true
            });

        } else {

            fs.unlinkSync(fullPath);
        }
    }
}


function clearPageCache(language) {

    const pagesFolder =
        path.join("./cache", language, "pages");

    const textFolder =
        path.join("./cache", language, "text");


    clearFolder(pagesFolder);
    clearFolder(textFolder);


    console.log(
        "Page and text caches cleared: " + language
    );
}


module.exports = clearPageCache;