import { createStore } from 'solid-js/store'

export interface PrefsState {
  chatVisible: boolean
  chatPosition: 'left' | 'right'
  autoClaimChannelPoints: boolean
}

const PREFS_KEY = 'twitch_prefs'
const DEFAULTS: PrefsState = {
  chatVisible: true,
  chatPosition: 'right',
  autoClaimChannelPoints: true,
}

function loadPrefs(): PrefsState {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return { ...DEFAULTS }
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    localStorage.removeItem(PREFS_KEY)
    return { ...DEFAULTS }
  }
}

const [prefsStore, setPrefsStore] = createStore<PrefsState>(loadPrefs())

export function updatePref<K extends keyof PrefsState>(key: K, value: PrefsState[K]): void {
  setPrefsStore(key, value)
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...prefsStore }))
  } catch {
    // localStorage write failure — in-memory state still updated
  }
}

export { prefsStore }
