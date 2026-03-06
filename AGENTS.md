# Repository Workflow Rules

This repository uses an automated development tracking workflow and it must remain active.

## Mandatory Session Start Flow

1. Read:
   - `docs/PROJECT_LOG.md`
   - `docs/ARCHITECTURE_STATE.md`
   - `docs/CHANGELOG.md`
2. Run `scripts/session-resume.ps1` to reconstruct state.
3. Continue work from the latest `Next Step` in `docs/PROJECT_LOG.md`.

## Mandatory Change Flow

After every code or documentation change:

1. Run `scripts/track-change.ps1` with:
   - `ActionType` (`Feature|Fix|Refactor|Upgrade|Docs`)
   - `Summary`
   - `Reason`
   - `Impact`
   - `NextStep`
2. Do not commit manually outside this script.

The script is responsible for:

- Updating `docs/CHANGELOG.md`
- Updating `docs/ARCHITECTURE_STATE.md`
- Appending to `docs/PROJECT_LOG.md`
- Creating a Conventional Commit
- Pushing to the remote repository
