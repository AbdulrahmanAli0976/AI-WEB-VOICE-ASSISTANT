$ErrorActionPreference = "Stop"

$repoRoot = (git rev-parse --show-toplevel 2>$null)
if (-not $repoRoot) {
    throw "Not inside a Git repository."
}

Set-Location $repoRoot.Trim()

git config core.hooksPath .githooks

Write-Output "Tracking hooks enabled with core.hooksPath=.githooks"
Write-Output "Use scripts/track-change.ps1 after each change."
