param(
    [Parameter(Mandatory = $true)][string]$ZipPath,
    [Parameter(Mandatory = $true)][string]$Task,
    [switch]$Apply
)
$ErrorActionPreference = 'Stop'
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
Push-Location -LiteralPath $projectRoot
try {
    $sceneZip = (Resolve-Path -LiteralPath $ZipPath).Path
    $stagingJson = & python scripts/receive-scene-zip.py $sceneZip --task $Task
    if ($LASTEXITCODE -ne 0) { throw 'ZIP validation failed; project content was not imported.' }
    $stagingResult = $stagingJson | ConvertFrom-Json
    $stagingResult | ConvertTo-Json -Depth 8
    if ($Apply) {
        & python scripts/import-reviewed-scenes.py $stagingResult.stage
        if ($LASTEXITCODE -ne 0) { throw 'Import stopped. Inspect the reported failure before publishing.' }
        & npm.cmd run check
        if ($LASTEXITCODE -ne 0) { throw 'Checks failed. Do not publish.' }
        Write-Output 'Imported and checked locally. Git commit/push and final main review remain separate.'
    }
} finally {
    Pop-Location
}
