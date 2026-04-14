import { describe, it } from 'vitest'

// Implementation lives in src/stores/authStore.ts (Wave 2)
describe('authStore', () => {
  it.todo('initialises token from localStorage.getItem("twitch_access_token")')
  it.todo('initialises refreshToken from localStorage.getItem("twitch_refresh_token")')
  it.todo('initialises expiresAt as Number(localStorage.getItem("twitch_expires_at")) or null')
  it.todo('initialises userId from localStorage.getItem("twitch_user_id")')
  it.todo('setAuthStore updates store state reactively')
})
