---
phase: 6
slug: settings-polish
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-15
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | SETT-02 | — | N/A | unit | `npx vitest run src/stores/prefsStore.test.ts` | ❌ W0 | ⬜ pending |
| 06-01-02 | 01 | 1 | SETT-01 | — | Token clearance complete | unit | `npx vitest run src/screens/SettingsScreen.test.ts` | ❌ W0 | ⬜ pending |
| 06-02-01 | 02 | 2 | SETT-01 | — | N/A | unit | `npx vitest run src/screens/PlayerScreen.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/stores/prefsStore.test.ts` — stubs for SETT-02 (preferences store)
- [ ] `src/screens/SettingsScreen.test.ts` — stubs for SETT-01 (logout flow)

*Existing vitest infrastructure covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| D-pad navigation has no dead ends across all screens | SETT-02 | Requires physical remote input on webOS device | Navigate every screen with D-pad, verify focus never gets stuck |
| Green button opens settings from any screen | SETT-01 | Requires webOS remote Green button (keyCode 404) | Press Green on each screen, verify settings access |
| Player settings overlay does not interrupt video | SETT-01 | Requires video playback + overlay rendering | Open overlay during stream, verify video continues |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
