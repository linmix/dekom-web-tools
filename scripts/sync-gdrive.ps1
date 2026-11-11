# sync-gdrive.ps1
# Synchronises the local DEKOM-web project to Google Drive
# using the tested FreeFileSync batch configuration.

$ErrorActionPreference = "Stop"

$FreeFileSyncExe = "C:\Program Files\FreeFileSync\FreeFileSync.exe"
$BatchFile = Join-Path $PSScriptRoot "DEKOM_web_gdrive_sync.ffs_batch"

# ------------------------------------------------------------
# Pre-flight checks
# ------------------------------------------------------------

if (-not (Test-Path $FreeFileSyncExe)) {
    Write-Host "Google Drive sync: FAILED"
    Write-Host "FreeFileSync not found:"
    Write-Host "  $FreeFileSyncExe"
    exit 2
}

if (-not (Test-Path $BatchFile)) {
    Write-Host "Google Drive sync: FAILED"
    Write-Host "Batch configuration not found:"
    Write-Host "  $BatchFile"
    exit 2
}

# ------------------------------------------------------------
# Run FreeFileSync
#
# FreeFileSync is a Windows GUI application. Piping through
# 'more' exposes its JSON stdout so PowerShell can capture it.
# ------------------------------------------------------------

try {
    $rawOutput = cmd /c """$FreeFileSyncExe"" ""$BatchFile"" | more"

    $jsonText = ($rawOutput -join [Environment]::NewLine).Trim()

    if ([string]::IsNullOrWhiteSpace($jsonText)) {
        throw "FreeFileSync returned no JSON output."
    }

    $result = $jsonText | ConvertFrom-Json
}
catch {
    Write-Host "Google Drive sync: FAILED"
    Write-Host $_.Exception.Message
    exit 2
}

# ------------------------------------------------------------
# Report result
# ------------------------------------------------------------

if ($result.syncResult -eq "success" -and
    $result.errors -eq 0 -and
    $result.warnings -eq 0) {

    Write-Host "Google Drive sync: OK"

    if ($result.processedItems -eq 0) {
        Write-Host "No changes required."
    }
    else {
        $size =
            if ($result.processedBytes -lt 1KB) {
                "$($result.processedBytes) bytes"
            }
            elseif ($result.processedBytes -lt 1MB) {
                "{0:N1} KB" -f ($result.processedBytes / 1KB)
            }
            elseif ($result.processedBytes -lt 1GB) {
                "{0:N1} MB" -f ($result.processedBytes / 1MB)
            }
            else {
                "{0:N2} GB" -f ($result.processedBytes / 1GB)
            }

        Write-Host "$($result.processedItems) item(s) synchronized, $size transferred."
    }

    exit 0
}

# ------------------------------------------------------------
# Warnings
# ------------------------------------------------------------

if ($result.warnings -gt 0 -and $result.errors -eq 0) {
    Write-Host "Google Drive sync: WARNING"
    Write-Host "Warnings: $($result.warnings)"
    Write-Host "Items processed: $($result.processedItems)"
    Write-Host "Log: $($result.logFile)"
    exit 1
}

# ------------------------------------------------------------
# Errors
# ------------------------------------------------------------

Write-Host "Google Drive sync: FAILED"
Write-Host "Result: $($result.syncResult)"
Write-Host "Errors: $($result.errors)"
Write-Host "Warnings: $($result.warnings)"
Write-Host "Log: $($result.logFile)"

exit 2