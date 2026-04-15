import { MemoryRouter, Route } from '@solidjs/router'
import { createMemoryHistory } from '@solidjs/router'
import { onMount, onCleanup } from 'solid-js'
import LoginScreen from './screens/LoginScreen'
import ChannelsScreen from './screens/ChannelsScreen'
import PlayerScreen from './screens/PlayerScreen'
import SettingsScreen from './screens/SettingsScreen'
import AuthGuard from './components/AuthGuard'

declare const webOS: { platformBack: () => void } | undefined

const ROOT_PATHS = ['/', '/login', '/channels']
const KEY_BACK = 461 // webOS remote Back button

const history = createMemoryHistory()
// Start at /channels if we have a stored token, /login otherwise
const initialRoute = localStorage.getItem('twitch_access_token') ? '/channels' : '/login'
history.set({ value: initialRoute })

export default function App() {
  function handleKeyDown(e: KeyboardEvent) {
    if (e.keyCode !== KEY_BACK) return
    e.preventDefault()

    const currentPath = history.get() ?? '/'
    if (ROOT_PATHS.includes(currentPath)) {
      // On a root screen — exit the app via webOS platform API
      if (typeof webOS !== 'undefined') {
        webOS.platformBack()
      }
    } else {
      // Navigate back to channels
      history.set({ value: '/channels' })
    }
  }

  onMount(() => window.addEventListener('keydown', handleKeyDown))
  onCleanup(() => window.removeEventListener('keydown', handleKeyDown))

  return (
    <MemoryRouter history={history} root={(props) => <>{props.children}</>}>
      <Route path="/login" component={LoginScreen} />
      <Route path="/" component={AuthGuard}>
        <Route path="/channels" component={ChannelsScreen} />
        <Route path="/player/:channel" component={PlayerScreen} />
        <Route path="/settings" component={SettingsScreen} />
      </Route>
    </MemoryRouter>
  )
}
