import { Show, onMount, onCleanup } from 'solid-js'
import { Focusable, useSpatialNavigation } from '../navigation'
import { twitchAuthService } from '../services/TwitchAuthService'
import { history } from '../router/history'
import styles from './LogoutConfirmDialog.module.css'

const KEY_BACK = 461

interface LogoutConfirmDialogProps {
  open: boolean
  onCancel: () => void
}

export default function LogoutConfirmDialog(props: LogoutConfirmDialogProps) {
  const { setFocus } = useSpatialNavigation()

  function handleBackKey(e: KeyboardEvent) {
    if (!props.open) return
    if (e.keyCode !== KEY_BACK) return
    e.stopPropagation()
    e.preventDefault()
    props.onCancel()
  }

  onMount(() => window.addEventListener('keydown', handleBackKey, true))
  onCleanup(() => window.removeEventListener('keydown', handleBackKey, true))

  function handleOpen() {
    setFocus('logout-cancel')
  }

  return (
    <Show when={props.open} keyed={false}>
      {/* Side-effect: set focus when dialog opens */}
      {(() => { handleOpen(); return null })()}
      <div class={styles.backdrop}>
        <div class={`${styles.panel} gap-col-lg`}>
          <h2 class={styles.heading}>
            Log out of Twitch?
          </h2>
          <p class={styles.description}>
            You will need to sign in again on your phone or computer.
          </p>
          <div class={`${styles.actions} gap-row-lg`}>
            <Focusable
              focusKey="logout-cancel"
              onEnterPress={() => props.onCancel()}
              as="div"
            >
              {({ focused }) => (
                <button
                  class={`${styles.button} ${styles.buttonCancel} ${focused() ? 'focused' : ''}`}
                >
                  Cancel
                </button>
              )}
            </Focusable>
            <Focusable
              focusKey="logout-confirm"
              onEnterPress={() => {
                twitchAuthService.clearTokens()
                history.set({ value: '/login' })
              }}
              as="div"
            >
              {({ focused }) => (
                <button
                  class={`${styles.button} ${styles.buttonConfirm} ${focused() ? 'focused' : ''}`}
                >
                  Log Out
                </button>
              )}
            </Focusable>
          </div>
        </div>
      </div>
    </Show>
  )
}
