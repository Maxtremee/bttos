---
phase: 2
slug: authentication
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-14
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^3.1.2 |
| **Config file** | `vitest.config.ts` (exists — merges with `vite.config.ts`) |
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
| 2-01-01 | 01 | 1 | — | — | N/A | config | `npm test` | ✅ | ⬜ pending |
| 2-01-02 | 01 | 1 | AUTH-01, AUTH-03, AUTH-04, AUTH-05 | — | N/A | scaffold | `npm test` | ❌ W0 | ⬜ pending |
| 2-02-01 | 02 | 2 | AUTH-03 | — | Token persistence in localStorage | unit | `npm test -- --reporter=verbose` | ❌ W0 | ⬜ pending |
| 2-02-02 | 02 | 2 | AUTH-01, AUTH-04 | — | Refresh token dedup singleton | unit | `npm test -- --reporter=verbose` | ❌ W0 | ⬜ pending |
| 2-03-01 | 03 | 3 | AUTH-01, AUTH-02 | — | Device code + QR display | unit | `npm test` | ❌ W0 | ⬜ pending |
| 2-04-01 | 04 | 3 | AUTH-05 | — | Auth guard redirect | unit | `npm test -- --reporter=verbose` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `npm install -D happy-dom` — DOM test environment for component tests
- [ ] `vitest.config.ts` — switch environment to `happy-dom`
- [ ] `src/services/__tests__/TwitchAuthService.test.ts` — stubs for AUTH-01, AUTH-04 (mock fetch)
- [ ] `src/stores/__tests__/authStore.test.ts` — stubs for AUTH-03 (mock localStorage)
- [ ] `src/components/__tests__/AuthGuard.test.tsx` — stubs for AUTH-05 (mock router, authStore)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Device code flow completes end-to-end with real Twitch | AUTH-01 | Requires real Twitch API interaction and user action on phone | 1. Build and run app 2. Note device code shown 3. Enter code at twitch.tv/activate on phone 4. App should advance to channels screen |
| QR code scans correctly | AUTH-02 | Requires phone camera to verify QR | 1. Open login screen 2. Scan QR with phone 3. Verify it opens twitch.tv/activate with code pre-filled |
| Token persists across app restart | AUTH-03 | Requires app restart | 1. Log in 2. Close and reopen app 3. Should skip login screen |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-04-14

---

## Validation Audit 2026-04-14

| Metric | Count |
|--------|-------|
| Gaps found | 1 |
| Resolved | 1 |
| Escalated | 0 |

AUTH-02 gap resolved: added `src/screens/__tests__/LoginScreen.test.tsx` with 2 tests (uqr renderSVG unit test + LoginScreen integration test). All 21 tests green.
