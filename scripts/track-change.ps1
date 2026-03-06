param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("Feature", "Fix", "Refactor", "Upgrade", "Docs")]
    [string]$ActionType,

    [Parameter(Mandatory = $true)]
    [string]$Summary,

    [Parameter(Mandatory = $true)]
    [string]$Reason,

    [Parameter(Mandatory = $true)]
    [string]$Impact,

    [Parameter(Mandatory = $true)]
    [string]$NextStep,

    [string]$Scope = "core",
    [switch]$NoPush
)

$ErrorActionPreference = "Stop"

function Get-RepoRoot {
    $root = (git rev-parse --show-toplevel 2>$null)
    if (-not $root) {
        throw "Not inside a Git repository."
    }
    return $root.Trim()
}

function Ensure-TrackingFiles {
    if (-not (Test-Path "docs")) {
        New-Item -ItemType Directory -Path "docs" | Out-Null
    }

    if (-not (Test-Path "docs/PROJECT_LOG.md")) {
        Set-Content -Path "docs/PROJECT_LOG.md" -Value "# Project Log`n"
    }

    if (-not (Test-Path "docs/ARCHITECTURE_STATE.md")) {
        Set-Content -Path "docs/ARCHITECTURE_STATE.md" -Value "# Architecture State`n`nLast Updated: Not set`n`n## Current System Structure`n`nNot set`n"
    }

    if (-not (Test-Path "docs/CHANGELOG.md")) {
        Set-Content -Path "docs/CHANGELOG.md" -Value "# Changelog`n`nAll notable changes to this project will be documented in this file.`n`n## [Unreleased]`n"
    }
}

function Get-ChangedFiles {
    $statusLines = git status --porcelain
    $files = @()

    foreach ($line in $statusLines) {
        if ($line.Length -lt 4) {
            continue
        }

        $path = $line.Substring(3).Trim()
        if ($path -like "* -> *") {
            $path = ($path -split " -> ")[-1]
        }

        if ($path) {
            $files += $path
        }
    }

    return $files | Sort-Object -Unique
}

function Get-BackendEndpoints {
    if (-not (Test-Path "backend/app.py")) {
        return @()
    }

    $pattern = "@app\.route\('([^']+)'(?:,\s*methods=\[([^\]]+)\])?\)"
    $matches = Select-String -Path "backend/app.py" -Pattern $pattern -AllMatches
    $endpoints = @()

    foreach ($matchInfo in $matches) {
        foreach ($match in $matchInfo.Matches) {
            $route = $match.Groups[1].Value
            $methods = $match.Groups[2].Value
            if (-not $methods) {
                $methods = "'GET'"
            }
            $methods = ($methods -replace "'", "") -replace '"', ""
            $methods = $methods.Trim()
            $endpoints += "$route [$methods]"
        }
    }

    return $endpoints | Sort-Object -Unique
}

function Get-FrontendApiTargets {
    if (-not (Test-Path "frontend/src/Chat.js")) {
        return @()
    }

    $pattern = "fetch\('([^']+)'"
    $matches = Select-String -Path "frontend/src/Chat.js" -Pattern $pattern -AllMatches
    $targets = @()

    foreach ($matchInfo in $matches) {
        foreach ($match in $matchInfo.Matches) {
            $targets += $match.Groups[1].Value
        }
    }

    return $targets | Sort-Object -Unique
}

function Update-Changelog {
    param(
        [string]$Timestamp,
        [string]$Type,
        [string]$ChangeSummary,
        [string]$FilesModified,
        [string]$ChangeImpact
    )

    $path = "docs/CHANGELOG.md"
    $lines = Get-Content -Path $path
    if (-not ($lines -contains "## [Unreleased]")) {
        $lines += ""
        $lines += "## [Unreleased]"
        $lines += ""
    }

    $entryLines = @(
        "- [$Timestamp] **$Type**: $ChangeSummary",
        "  - Files: $FilesModified",
        "  - Impact: $ChangeImpact"
    )

    $result = New-Object System.Collections.Generic.List[string]
    $inserted = $false

    for ($i = 0; $i -lt $lines.Count; $i++) {
        $result.Add($lines[$i])
        if (-not $inserted -and $lines[$i] -eq "## [Unreleased]") {
            $result.Add("")
            foreach ($entry in $entryLines) {
                $result.Add($entry)
            }
            $inserted = $true
        }
    }

    Set-Content -Path $path -Value ($result -join "`n")
}

function Update-ArchitectureState {
    param([string]$Timestamp)

    $trackedFiles = git ls-files
    $backendCount = ($trackedFiles | Where-Object { $_ -like "backend/*" }).Count
    $frontendCount = ($trackedFiles | Where-Object { $_ -like "frontend/*" }).Count
    $docsCount = ($trackedFiles | Where-Object { $_ -like "docs/*" }).Count
    $scriptsCount = ($trackedFiles | Where-Object { $_ -like "scripts/*" -or $_ -like ".githooks/*" }).Count

    $endpoints = Get-BackendEndpoints
    if (-not $endpoints) {
        $endpoints = @("Not detected")
    }

    $apiTargets = Get-FrontendApiTargets
    if (-not $apiTargets) {
        $apiTargets = @("Not detected")
    }

    $topLevel = @()
    foreach ($name in @("backend", "frontend", "docs", "scripts", ".githooks")) {
        if (Test-Path $name) {
            $topLevel += "- $name/"
        }
    }
    $topLevel += (git ls-files | Where-Object { $_ -notmatch "/" } | ForEach-Object { "- $_" })

    $endpointLines = $endpoints | ForEach-Object { "- $_" }
    $apiTargetLines = $apiTargets | ForEach-Object { "- $_" }

    $content = @(
        "# Architecture State",
        "",
        "Last Updated: $Timestamp",
        "",
        "## Current System Structure",
        "",
        "### Top Level",
        $topLevel,
        "",
        "### File Distribution",
        "- backend files: $backendCount",
        "- frontend files: $frontendCount",
        "- docs files: $docsCount",
        "- automation files: $scriptsCount",
        "",
        "## Backend API Endpoints",
        $endpointLines,
        "",
        "## Frontend API Targets",
        $apiTargetLines,
        "",
        "## Operational Workflow",
        "- Session reconstruction is driven by docs/PROJECT_LOG.md, docs/ARCHITECTURE_STATE.md, docs/CHANGELOG.md.",
        "- Change tracking, commit, and push are handled by scripts/track-change.ps1.",
        "- Git hooks enforce Conventional Commits and tracking-doc inclusion."
    )

    Set-Content -Path "docs/ARCHITECTURE_STATE.md" -Value ($content -join "`n")
}

function Append-ProjectLog {
    param(
        [string]$Timestamp,
        [string]$Type,
        [string]$ChangeSummary,
        [string]$FilesModified,
        [string]$ChangeReason,
        [string]$ChangeImpact,
        [string]$Next
    )

    $entry = @(
        "[$Timestamp]",
        "Action Type: $Type",
        "Summary: $ChangeSummary",
        "Files Modified: $FilesModified",
        "Reason: $ChangeReason",
        "Impact: $ChangeImpact",
        "Next Step: $Next",
        ""
    )

    Add-Content -Path "docs/PROJECT_LOG.md" -Value ($entry -join "`n")
}

function Get-CommitType {
    param([string]$Type)

    $map = @{
        "Feature"  = "feat"
        "Fix"      = "fix"
        "Refactor" = "refactor"
        "Upgrade"  = "chore"
        "Docs"     = "docs"
    }

    return $map[$Type]
}

$repoRoot = Get-RepoRoot
Set-Location $repoRoot

Ensure-TrackingFiles

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
$changedBeforeTracking = Get-ChangedFiles
$filesForLog = @($changedBeforeTracking + @(
    "docs/CHANGELOG.md",
    "docs/ARCHITECTURE_STATE.md",
    "docs/PROJECT_LOG.md"
)) | Sort-Object -Unique

$filesText = if ($filesForLog.Count -gt 0) {
    $filesForLog -join ", "
}
else {
    "None"
}

Update-Changelog -Timestamp $timestamp -Type $ActionType -ChangeSummary $Summary -FilesModified $filesText -ChangeImpact $Impact
Update-ArchitectureState -Timestamp $timestamp
Append-ProjectLog -Timestamp $timestamp -Type $ActionType -ChangeSummary $Summary -FilesModified $filesText -ChangeReason $Reason -ChangeImpact $Impact -Next $NextStep

git add -A

$staged = git diff --cached --name-only
if (-not $staged) {
    Write-Output "No staged changes to commit."
    exit 0
}

$commitType = Get-CommitType -Type $ActionType
$commitMessage = "$commitType($Scope): $Summary"
git commit -m $commitMessage

if (-not $NoPush) {
    $branch = (git branch --show-current).Trim()
    $upstream = (git rev-parse --abbrev-ref --symbolic-full-name "@{u}" 2>$null)
    if ($LASTEXITCODE -ne 0 -or -not $upstream) {
        git push -u origin $branch
    }
    else {
        git push
    }
}

Write-Output "Tracking update complete."
