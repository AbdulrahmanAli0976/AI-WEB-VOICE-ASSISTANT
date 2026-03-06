# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

- [2026-03-06 17:34] **Fix**: fix changed-file parsing in tracking logs
  - Files: scripts/track-change.ps1docs/CHANGELOG.md docs/ARCHITECTURE_STATE.md docs/PROJECT_LOG.md
  - Impact: Tracking entries now list modified files correctly and consistently.

- [2026-03-06 17:33] **Fix**: correct architecture snapshot rendering in tracking automation
  - Files: scripts/track-change.ps1docs/CHANGELOG.md docs/ARCHITECTURE_STATE.md docs/PROJECT_LOG.md
  - Impact: ARCHITECTURE_STATE now records accurate structure, file distribution, endpoint list, and API targets.

- [2026-03-06 17:32] **Feature**: implement automated development tracking system
  - Files: .githooks/, AGENTS.md, docs/, docs/ARCHITECTURE_STATE.md, docs/CHANGELOG.md, docs/PROJECT_LOG.md, scripts/
  - Impact: All future changes now require structured logs, architecture snapshots, changelog updates, conventional commits, and push automation.

