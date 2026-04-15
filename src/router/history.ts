import { createMemoryHistory } from '@solidjs/router'

const initialRoute = localStorage.getItem('twitch_access_token') ? '/channels' : '/login'

export const history = createMemoryHistory()
history.set({ value: initialRoute })
