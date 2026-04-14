---
phase: 3
slug: channel-list
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-14
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.1.2 with happy-dom |
| **Config file** | vite.config.ts (vitest inferred) |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | CHAN-01 | — | N/A | unit | `npm test -- src/services/__tests__/TwitchChannelService.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | CHAN-01 | — | N/A | unit | `npm test -- src/services/__tests__/TwitchChannelService.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | CHAN-01 | — | N/A | unit | `npm test -- src/components/__tests__/ChannelCard.test.tsx` | ❌ W0 | ⬜ pending |
| 03-01-04 | 01 | 1 | CHAN-01 | — | N/A | unit | `npm test -- src/services/__tests__/TwitchChannelService.test.ts` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 1 | CHAN-02 | — | N/A | unit | `npm test -- src/components/__tests__/ChannelGrid.test.tsx` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 1 | CHAN-02 | — | N/A | unit | `npm test -- src/components/__tests__/ChannelGrid.test.tsx` | ❌ W0 | ⬜ pending |
| 03-03-01 | 03 | 2 | CHAN-03 | — | N/A | unit | `npm test -- src/screens/__tests__/ChannelsScreen.test.tsx` | ❌ W0 | ⬜ pending |
| 03-03-02 | 03 | 2 | CHAN-03 | — | N/A | unit | `npm test -- src/screens/__tests__/ChannelsScreen.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/services/__tests__/TwitchChannelService.test.ts` — stubs for CHAN-01 fetch logic and pagination
- [ ] `src/components/__tests__/ChannelCard.test.tsx` — stubs for CHAN-01 thumbnail substitution and viewer count formatting
- [ ] `src/components/__tests__/ChannelGrid.test.tsx` — stubs for CHAN-02 focus key assignment and navigation
- [ ] `src/screens/__tests__/ChannelsScreen.test.tsx` — stubs for CHAN-03 polling setup and teardown

*Follow existing test pattern: `vi.mock` + `solid-js/web` `render()` with happy-dom (see `AuthGuard.test.tsx`).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| D-pad moves focus across grid on real TV | CHAN-02 | Physical hardware required | Launch app on webOS TV, use remote to navigate grid |
| Focus ring visible on all cards | CHAN-02 | Visual verification | Inspect each card state on TV screen |
| Auto-refresh does not disrupt focus position | CHAN-03 | Timing-sensitive UX | Watch grid during refresh interval, confirm focus stays |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
