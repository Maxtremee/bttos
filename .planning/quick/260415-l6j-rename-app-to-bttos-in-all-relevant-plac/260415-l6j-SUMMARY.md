---
phase: quick
plan: 260415-l6j
type: quick-task
tags: [rename, branding, config]
key-files:
  modified:
    - appinfo.json
    - index.html
    - package.json
    - package-lock.json
decisions:
  - App ID changed from com.dev.twitchalt to com.dev.bttos
metrics:
  duration: ~5min
  completed: "2026-04-15"
  tasks: 1
  files: 4
---

# Quick Task 260415-l6j: Rename App to BTTOS Summary

**One-liner:** Rebranded app from "Twitch Alt" / "twitch-webos-alt" to "BTTOS" across all webOS metadata, HTML, and package config files.

## What Was Done

Renamed all user-visible and build-relevant identifiers to the new BTTOS brand:

| File | Change |
|------|--------|
| `appinfo.json` | `id`: `com.dev.twitchalt` → `com.dev.bttos`; `title`: `"Twitch Alt"` → `"BTTOS"` |
| `index.html` | `<title>`: `Twitch Alt` → `BTTOS` |
| `package.json` | `name`: `twitch-webos-alt` → `bttos`; deploy script ipk filename updated |
| `package-lock.json` | Both `name` fields updated to `bttos` |

## Verification

- All rename checks passed via automated verification script
- `npm run build` completed successfully (4 files changed, 7 insertions/7 deletions vs base)

## Commits

| Hash | Description |
|------|-------------|
| 69b0735 | chore(260415-l6j): rename app to BTTOS in all config and metadata files |

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- appinfo.json: FOUND with id=com.dev.bttos, title=BTTOS
- index.html: FOUND with title BTTOS
- package.json: FOUND with name=bttos, deploy script updated
- package-lock.json: FOUND with name=bttos
- Commit 69b0735: FOUND
