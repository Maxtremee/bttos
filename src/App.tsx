import { MemoryRouter, Route } from '@solidjs/router'
import { onMount, onCleanup } from 'solid-js'
import { history } from './router/history'
import LoginScreen from './screens/LoginScreen'
import ChannelsScreen from './screens/ChannelsScreen'
import PlayerScreen from './screens/PlayerScreen'
import SettingsScreen from './screens/SettingsScreen'
import AuthGuard from './components/AuthGuard'
import { KEY_BACK, KEY_GREEN } from './const/keys'

declare const webOS: { platformBack: () => void } | undefined

const ROOT_PATHS = ['/', '/login', '/channels']

export default function App() {
  function handleKeyDown(e: KeyboardEvent) {
    if (e.keyCode === KEY_GREEN) {
      e.preventDefault()
      const currentPath = history.get() ?? '/'
      if (currentPath === '/channels') {
        history.set({ value: '/settings' })
      }
      // PlayerScreen handles its own Green button via its local handleKeyDown
      return
    }

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
