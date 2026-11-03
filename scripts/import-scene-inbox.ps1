param([switch]$Apply)
$ErrorActionPreference = 'Stop'
$sceneProjectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$sceneInbox = Join-Path $sceneProjectRoot 'incoming/scene-zips'
if (-not (Test-Path -LiteralPath $sceneInbox)) { throw 'Create incoming/scene-zips and place the returned ZIPs there.' }
$sceneArchives = @(Get-ChildItem -LiteralPath $sceneInbox -File -Filter '*.zip' | Sort-Object Name)
if ($sceneArchives.Count -eq 0) { throw 'No returned ZIPs found in incoming/scene-zips.' }
foreach ($sceneArchive in $sceneArchives) {
    if ($sceneArchive.Name -notmatch '^(EP-(?:IMG|REF)-\d{3})(?:-[A-Za-z0-9_-]+)?\.zip$') { throw "Unexpected archive name: $($sceneArchive.Name)" }
    $sceneTaskId = $Matches[1]
    & (Join-Path $PSScriptRoot 'receive-scenes.ps1') -ZipPath $sceneArchive.FullName -Task $sceneTaskId -Apply:$Apply
    if (-not $?) { throw "Stopped on $($sceneArchive.Name); inspect before publishing." }
}
