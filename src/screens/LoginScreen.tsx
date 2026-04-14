import { createSignal, onMount, onCleanup, createMemo, Show } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import { renderSVG } from 'uqr'
import { Focusable, useSpatialNavigation } from '../navigation'
import { twitchAuthService, type DeviceCodeResponse } from '../services/TwitchAuthService'

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
    <main style={{
      padding: 'var(--space-2xl)',
      'min-height': '100vh',
      display: 'flex',
      'flex-direction': 'column',
      'justify-content': 'center',
      gap: 'var(--space-xl)',
      background: 'var(--color-bg)',
    }}>
      <h1 style={{
        'font-size': 'var(--font-size-heading)',
        'font-weight': 'var(--font-weight-semibold)',
        'line-height': 'var(--line-height-heading)',
        color: 'var(--color-text-primary)',
        margin: 0,
      }}>
        Sign in with Twitch
      </h1>

      <Show when={state() === 'loading'}>
        <p style={{ 'font-size': 'var(--font-size-body)', color: 'var(--color-text-secondary)' }}>
          Loading...
        </p>
      </Show>

      <Show when={state() === 'polling' || state() === 'success'}>
        <div style={{
          display: 'flex',
          'flex-direction': 'row',
          gap: 'var(--space-2xl)',
          'align-items': 'flex-start',
        }}>
          {/* QR Code column */}
          <div style={{ display: 'flex', 'flex-direction': 'column', gap: 'var(--space-md)' }}>
            <div
              innerHTML={qrSvg()}
              style={{
                width: '200px',
                height: '200px',
                background: '#ffffff',
                padding: '8px',
              }}
            />
            <p style={{
              'font-size': 'var(--font-size-body)',
              color: 'var(--color-text-secondary)',
              margin: 0,
            }}>
              {verificationHost()}
            </p>
          </div>

          {/* Code column */}
          <div
            id="login-status-region"
            style={{ display: 'flex', 'flex-direction': 'column', gap: 'var(--space-md)' }}
          >
            <p style={{ 'font-size': 'var(--font-size-body)', color: 'var(--color-text-primary)', margin: 0 }}>
              Go to twitch.tv/activate on your phone or PC, then enter:
            </p>
            <p style={{
              'font-size': 'var(--font-size-display)',
              'font-weight': 'var(--font-weight-semibold)',
              'line-height': 'var(--line-height-display)',
              color: 'var(--color-text-primary)',
              'letter-spacing': '0.1em',
              margin: 0,
            }}>
              {deviceCodeData()?.user_code ?? ''}
            </p>
            <p style={{ 'font-size': 'var(--font-size-body)', color: 'var(--color-text-secondary)', margin: 0 }}>
              {statusMessage()}
            </p>
          </div>
        </div>
      </Show>

      <Show when={state() === 'expired' || state() === 'error'}>
        <div style={{ display: 'flex', 'flex-direction': 'column', gap: 'var(--space-md)' }}>
          <p style={{ 'font-size': 'var(--font-size-body)', color: 'var(--color-text-primary)', margin: 0 }}>
            {statusMessage()}
          </p>
          <Focusable focusKey="login-retry-btn" as="div" style={{ display: 'inline-block' }}>
            {({ focused }: { focused: () => boolean }) => (
              <button
                class={focused() ? 'focused' : ''}
                onClick={startFlow}
                style={{
                  'min-height': 'var(--min-target-height)',
                  padding: 'var(--space-md) var(--space-xl)',
                  'font-size': 'var(--font-size-label)',
                  'font-weight': 'var(--font-weight-semibold)',
                  background: 'var(--color-accent)',
                  color: 'var(--color-text-primary)',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Request new code
              </button>
            )}
          </Focusable>
        </div>
      </Show>
    </main>
  )
}
