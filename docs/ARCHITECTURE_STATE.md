# Architecture State

Last Updated: 2026-03-06 17:33

## Current System Structure

### Top Level
- backend/
- frontend/
- docs/
- scripts/
- .githooks/
- .gitignore
- AGENTS.md
- commit_message.txt
- README.md

### File Distribution
- backend files: 4
- frontend files: 21
- docs files: 3
- automation files: 5

## Backend API Endpoints
- / [GET]
- /ask [POST]
- /clear [POST]

## Frontend API Targets
- https://ai-web-voice-assistant.onrender.com/ask
- https://ai-web-voice-assistant.onrender.com/clear

## Operational Workflow
- Session reconstruction is driven by docs/PROJECT_LOG.md, docs/ARCHITECTURE_STATE.md, docs/CHANGELOG.md.
- Change tracking, commit, and push are handled by scripts/track-change.ps1.
- Git hooks enforce Conventional Commits and tracking-doc inclusion.
