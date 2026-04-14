import { MemoryRouter, Route } from '@solidjs/router'
import { createMemoryHistory } from '@solidjs/router'
import { createSignal, Show, onMount, onCleanup } from 'solid-js'
import LoginScreen from './screens/LoginScreen'
import ChannelsScreen from './screens/ChannelsScreen'
import PlayerScreen from './screens/PlayerScreen'
import SettingsScreen from './screens/SettingsScreen'
import ExitConfirmDialog from './components/ExitConfirmDialog'
import AuthGuard from './components/AuthGuard'

// Root screens: Back on these triggers exit confirmation (D-03)
const ROOT_PATHS = ['/', '/login']

const KEY_BACK = 461 // webOS remote Back button (keyCode 0x1CD)

const history = createMemoryHistory()
// Start at /login — AuthGuard will redirect to /login anyway if no token,
// and authenticated users get redirected to /channels by LoginScreen
history.set({ value: '/login' })

export default function App() {
  const [showExitDialog, setShowExitDialog] = createSignal(false)

  function handleBack() {
    const currentPath = history.get() ?? '/'

    if (showExitDialog()) {
      // Back while dialog is open: dismiss dialog (same as Cancel)
      setShowExitDialog(false)
      return
    }

    if (ROOT_PATHS.includes(currentPath)) {
      // On a root screen: show exit confirmation dialog (D-03)
      setShowExitDialog(true)
    } else {
      // On a non-root screen: navigate back in history
      history.set({ value: currentPath === '/settings' ? '/channels' : '/channels' })
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.keyCode === KEY_BACK) {
      e.preventDefault()
      handleBack()
    }
  }

  onMount(() => window.addEventListener('keydown', handleKeydown))
  onCleanup(() => window.removeEventListener('keydown', handleKeydown))

  return (
    <>
      <MemoryRouter history={history} root={(props) => <>{props.children}</>}>
        <Route path="/login" component={LoginScreen} />
        <Route path="/" component={AuthGuard}>
          <Route path="/channels" component={ChannelsScreen} />
          <Route path="/player/:channel" component={PlayerScreen} />
          <Route path="/settings" component={SettingsScreen} />
        </Route>
      </MemoryRouter>
      <Show when={showExitDialog()}>
        <ExitConfirmDialog
          onExit={() => window.close()}
          onCancel={() => setShowExitDialog(false)}
        />
      </Show>
    </>
  )
}
