---
phase: 4
slug: stream-playback
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-14
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 3.x + happy-dom |
| **Config file** | `vite.config.ts` (vitest inline config) |
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
| 04-01-01 | 01 | 1 | PLAY-01 | — | N/A | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 1 | PLAY-01 | — | N/A | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 1 | PLAY-02 | — | N/A | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 04-03-01 | 03 | 2 | PLAY-03 | — | N/A | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 04-04-01 | 04 | 2 | PLAY-04 | — | N/A | unit | `npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/services/__tests__/TwitchStreamService.test.ts` — stubs for PLAY-01, PLAY-02 (GQL + Usher flow)
- [ ] `src/screens/__tests__/PlayerScreen.test.tsx` — stubs for PLAY-03, PLAY-04 (player state machine, info bar, error handling)
- [ ] `npm install hls.js@^1.6.16` — HLS playback dependency

*Existing vitest + happy-dom infrastructure covers test framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Video plays on webOS TV | PLAY-01 | Requires physical device with MSE | Deploy .ipk to webOS TV, select a live channel, verify video renders |
| ABR switches quality on bandwidth change | PLAY-02 | Requires network throttling on device | Use TV developer tools or router QoS to throttle, verify quality adapts |
| Stream info bar shows/hides on remote press | PLAY-04 | Requires TV remote D-pad input | Press OK/directional on remote during playback, verify overlay appears/disappears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
