$ErrorActionPreference = "Stop"

function Ensure-Exists {
    param([string]$Path)
    if (-not (Test-Path $Path)) {
        throw "Missing required tracking file: $Path"
    }
}

Ensure-Exists "docs/PROJECT_LOG.md"
Ensure-Exists "docs/ARCHITECTURE_STATE.md"
Ensure-Exists "docs/CHANGELOG.md"

$projectLog = Get-Content "docs/PROJECT_LOG.md"
$architecture = Get-Content "docs/ARCHITECTURE_STATE.md"
$changelog = Get-Content "docs/CHANGELOG.md"

$lastTimestampMatch = Select-String -Path "docs/PROJECT_LOG.md" -Pattern "^\[(.+)\]$" -AllMatches
$lastNextStepMatch = Select-String -Path "docs/PROJECT_LOG.md" -Pattern "^Next Step:\s*(.*)$" -AllMatches
$lastSummaryMatch = Select-String -Path "docs/PROJECT_LOG.md" -Pattern "^Summary:\s*(.*)$" -AllMatches
$lastActionTypeMatch = Select-String -Path "docs/PROJECT_LOG.md" -Pattern "^Action Type:\s*(.*)$" -AllMatches

$lastTimestamp = if ($lastTimestampMatch.Matches.Count -gt 0) { $lastTimestampMatch.Matches[-1].Groups[1].Value } else { "None" }
$lastNextStep = if ($lastNextStepMatch.Matches.Count -gt 0) { $lastNextStepMatch.Matches[-1].Groups[1].Value } else { "None" }
$lastSummary = if ($lastSummaryMatch.Matches.Count -gt 0) { $lastSummaryMatch.Matches[-1].Groups[1].Value } else { "None" }
$lastActionType = if ($lastActionTypeMatch.Matches.Count -gt 0) { $lastActionTypeMatch.Matches[-1].Groups[1].Value } else { "None" }

$lastArchitectureUpdate = "None"
foreach ($line in $architecture) {
    if ($line -like "Last Updated:*") {
        $lastArchitectureUpdate = $line.Replace("Last Updated:", "").Trim()
        break
    }
}

$latestChangelogLine = ($changelog | Where-Object { $_ -match "^- \[" } | Select-Object -First 1)
if (-not $latestChangelogLine) {
    $latestChangelogLine = "None"
}

Write-Output "Session Reconstruction"
Write-Output "----------------------"
Write-Output "Last Log Timestamp : $lastTimestamp"
Write-Output "Last Action Type   : $lastActionType"
Write-Output "Last Summary       : $lastSummary"
Write-Output "Last Next Step     : $lastNextStep"
Write-Output "Architecture State : $lastArchitectureUpdate"
Write-Output "Latest Changelog   : $latestChangelogLine"
Write-Output ""
Write-Output "CONTINUE_FROM: $lastNextStep"
