const path = require("path");
const {
    spawnSync
} = require("child_process");


function syncGdrive() {

    const projectRoot =
        path.resolve(
            __dirname,
            ".."
        );

    const script =
        path.join(
            projectRoot,
            "scripts",
            "sync-gdrive.ps1"
        );


    console.log("");
    console.log("Syncing project with Google Drive...");

    const result =
        spawnSync(
            "powershell.exe",
            [
                "-NoLogo",
                "-NoProfile",
                "-NonInteractive",
                "-ExecutionPolicy",
                "Bypass",
                "-File",
                script
            ],
            {
                cwd: projectRoot,
                stdio: "inherit",
                windowsHide: true
            }
        );


    if (result.error) {

        throw new Error(
            `Unable to start Google Drive sync: ${result.error.message}`
        );
    }


    if (result.status !== 0) {

        throw new Error(
            `Google Drive sync exited with code ${result.status}.`
        );
    }
}


module.exports =
    syncGdrive;