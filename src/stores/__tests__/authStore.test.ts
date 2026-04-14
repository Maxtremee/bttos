import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('authStore', () => {
  beforeEach(() => {
    vi.resetModules()
    localStorage.clear()
  })

  it('initialises token from localStorage.getItem("twitch_access_token")', async () => {
    localStorage.setItem('twitch_access_token', 'tok123')
    const { authStore } = await import('../authStore')
    expect(authStore.token).toBe('tok123')
  })

  it('initialises refreshToken from localStorage.getItem("twitch_refresh_token")', async () => {
    localStorage.setItem('twitch_refresh_token', 'ref456')
    const { authStore } = await import('../authStore')
    expect(authStore.refreshToken).toBe('ref456')
  })

  it('initialises expiresAt as Number(localStorage.getItem("twitch_expires_at")) or null', async () => {
    // With value
    localStorage.setItem('twitch_expires_at', '1700000000000')
    const { authStore: storeWithValue } = await import('../authStore')
    expect(storeWithValue.expiresAt).toBe(1700000000000)

    vi.resetModules()
    localStorage.clear()

    // Without value - should be null
    const { authStore: storeWithNull } = await import('../authStore')
    expect(storeWithNull.expiresAt).toBeNull()
  })

  it('initialises userId from localStorage.getItem("twitch_user_id")', async () => {
    localStorage.setItem('twitch_user_id', 'user789')
    const { authStore } = await import('../authStore')
    expect(authStore.userId).toBe('user789')
  })

  it('setAuthStore updates store state reactively', async () => {
    const { authStore, setAuthStore } = await import('../authStore')
    setAuthStore({ token: 'new_token' })
    expect(authStore.token).toBe('new_token')
  })
})
