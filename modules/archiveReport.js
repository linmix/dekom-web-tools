const fs = require("fs");
const path = require("path");

function archiveReport(filePath, reportFolder) {
    if (!fs.existsSync(filePath)) {
        return null;
    }

    const report = JSON.parse(
        fs.readFileSync(filePath, "utf8")
    );

    const timestamp = report.generated
        ? report.generated.replace(/[:.]/g, "-")
        : "unknown-date";

    const archiveFolder = path.join(
        reportFolder,
        "archive"
    );

    fs.mkdirSync(archiveFolder, {
        recursive: true
    });

    const filename = path.basename(filePath);

    const archivePath = path.join(
        archiveFolder,
        `${timestamp}-${filename}`
    );

    fs.renameSync(
        filePath,
        archivePath
    );

    return archivePath;
}

module.exports = archiveReport;