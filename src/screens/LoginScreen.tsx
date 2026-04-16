import { createSignal, onMount, onCleanup, createMemo, Show } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import { renderSVG } from 'uqr'
import { useSpatialNavigation } from '../navigation'
import { twitchAuthService, type DeviceCodeResponse } from '../services/TwitchAuthService'
import ActionButton from '../components/atoms/ActionButton'
import styles from './LoginScreen.module.css'

type AuthScreenState = 'loading' | 'polling' | 'success' | 'expired' | 'error'

export default function LoginScreen() {
  const navigate = useNavigate()
  const { setFocus } = useSpatialNavigation()

  const [state, setState] = createSignal<AuthScreenState>('loading')
  const [deviceCodeData, setDeviceCodeData] = createSignal<DeviceCodeResponse | null>(null)
  const [statusMessage, setStatusMessage] = createSignal('Requesting code...')

  let intervalId: ReturnType<typeof setInterval> | undefined

  function clearPolling() {
    if (intervalId !== undefined) {
      clearInterval(intervalId)
      intervalId = undefined
    }
  }

  async function startFlow() {
    setState('loading')
    setStatusMessage('Requesting code...')
    clearPolling()
    try {
      const data = await twitchAuthService.requestDeviceCode()
      setDeviceCodeData(data)
      setState('polling')
      setStatusMessage('Waiting for authorization...')
      setFocus('login-status-region')

      const expiresAt = Date.now() + data.expires_in * 1000

      intervalId = setInterval(async () => {
        if (Date.now() >= expiresAt) {
          clearPolling()
          setState('expired')
          setStatusMessage('Code expired.')
          setFocus('login-retry-btn')
          return
        }
        const result = await twitchAuthService.pollForToken(data.device_code)
        if (result === 'pending') return
        if (result === 'expired') {
          clearPolling()
          setState('expired')
          setStatusMessage('Code expired.')
          setFocus('login-retry-btn')
          return
        }
        // TokenResponse — success
        clearPolling()
        // Fetch authenticated user's ID from Helix /users
        const userRes = await fetch('https://api.twitch.tv/helix/users', {
          headers: {
            'Authorization': `Bearer ${result.access_token}`,
            'Client-Id': import.meta.env.VITE_TWITCH_CLIENT_ID as string,
          },
        })
        const userData = await userRes.json() as { data: { id: string }[] }
        const userId = userData.data?.[0]?.id ?? ''
        twitchAuthService.persistTokens(result, userId)
        setState('success')
        setStatusMessage('Signed in! Loading your channels...')
        setTimeout(() => navigate('/channels', { replace: true }), 500)
      }, data.interval * 1000)
    } catch {
      setState('error')
      setStatusMessage('Could not reach Twitch. Check your connection.')
      setFocus('login-retry-btn')
    }
  }

  onMount(() => {
    startFlow()
  })

  onCleanup(() => {
    clearPolling()
  })

  const qrSvg = createMemo(() => {
    const data = deviceCodeData()
    if (!data) return ''
    return renderSVG(data.verification_uri)
  })

  const verificationHost = createMemo(() => {
    const data = deviceCodeData()
    if (!data) return 'twitch.tv/activate'
    try {
      return new URL(data.verification_uri).host + new URL(data.verification_uri).pathname
    } catch {
      return 'twitch.tv/activate'
    }
  })

  return (
    <main class={`${styles.screen} gap-col-xl`}>
      <h1 class={styles.heading}>
        Sign in with Twitch
      </h1>

      <Show when={state() === 'loading'}>
        <p class={styles.loadingText}>
          Loading...
        </p>
      </Show>

      <Show when={state() === 'polling' || state() === 'success'}>
        <div class={`${styles.pollingRow} gap-row-2xl`}>
          {/* QR Code column */}
          <div class={`${styles.qrColumn} gap-col-md`}>
            <div
              innerHTML={qrSvg()}
              class={styles.qrCode}
            />
            <p class={styles.verificationHost}>
              {verificationHost()}
            </p>
          </div>

          {/* Code column */}
          <div
            id="login-status-region"
            class={`${styles.codeColumn} gap-col-md`}
          >
            <p class={styles.instructionText}>
              Go to twitch.tv/activate on your phone or PC, then enter:
            </p>
            <p class={styles.userCode}>
              {deviceCodeData()?.user_code ?? ''}
            </p>
            <p class={styles.statusMessage}>
              {statusMessage()}
            </p>
          </div>
        </div>
      </Show>

      <Show when={state() === 'expired' || state() === 'error'}>
        <div class={`${styles.errorColumn} gap-col-md`}>
          <p class={styles.errorText}>
            {statusMessage()}
          </p>
          <ActionButton focusKey="login-retry-btn" onPress={startFlow}>
            Request new code
          </ActionButton>
        </div>
      </Show>
    </main>
  )
}
