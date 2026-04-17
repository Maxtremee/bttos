---
phase: 5
slug: chat
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-14
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | CHAT-01 | — | N/A | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 1 | CHAT-02 | — | N/A | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 05-02-01 | 02 | 1 | CHAT-03 | — | N/A | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 05-02-02 | 02 | 1 | CHAT-04 | — | N/A | unit | `npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/services/__tests__/TwitchChatService.test.ts` — stubs for CHAT-01, CHAT-02
- [ ] `src/services/__tests__/EmoteService.test.ts` — stubs for CHAT-03, CHAT-04

*Existing vitest infrastructure covers framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Chat overlay visually renders over video | CHAT-01 | Requires real webOS TV or browser with video playing | Launch app, navigate to stream, verify chat messages appear overlaid on video |
| Remote button toggles chat | CHAT-02 | Requires physical TV remote input | Press designated button, verify overlay toggles without interrupting stream |
| Emotes render as images | CHAT-03, CHAT-04 | Visual verification of image rendering | Send/find message with emotes, verify images render instead of text codes |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
