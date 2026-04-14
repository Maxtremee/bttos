import { createStore } from 'solid-js/store'

export interface AuthState {
  token: string | null
  refreshToken: string | null
  expiresAt: number | null   // Unix ms timestamp
  userId: string | null
}

const storedExpiresAt = localStorage.getItem('twitch_expires_at')

const [authStore, setAuthStore] = createStore<AuthState>({
  token: localStorage.getItem('twitch_access_token'),
  refreshToken: localStorage.getItem('twitch_refresh_token'),
  expiresAt: storedExpiresAt ? Number(storedExpiresAt) : null,
  userId: localStorage.getItem('twitch_user_id'),
})

export { authStore, setAuthStore }
