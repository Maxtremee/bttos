// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from 'solid-js/web'
import { renderSVG } from 'uqr'

// --- Module mocks (must be declared before any imports of the module under test) ---

const mockNavigate = vi.fn()
vi.mock('@solidjs/router', () => ({
  useNavigate: () => mockNavigate,
}))

const mockSetFocus = vi.fn()
vi.mock('../../navigation', () => ({
  useSpatialNavigation: () => ({ setFocus: mockSetFocus }),
  Focusable: (props: { children: (bag: { focused: () => boolean }) => unknown }) =>
    props.children({ focused: () => false }),
}))

const mockRequestDeviceCode = vi.fn()
const mockPollForToken = vi.fn()
const mockPersistTokens = vi.fn()
vi.mock('../../services/TwitchAuthService', () => ({
  twitchAuthService: {
    get requestDeviceCode() { return mockRequestDeviceCode },
    get pollForToken() { return mockPollForToken },
    get persistTokens() { return mockPersistTokens },
  },
}))

// Import AFTER mocks
import LoginScreen from '../LoginScreen'

// ---------------------------------------------------------------------------

const MOCK_DEVICE_CODE_RESPONSE = {
  device_code: 'device_abc',
  user_code: 'ABCD-1234',
  verification_uri: 'https://www.twitch.tv/activate?device-code=ABCD1234',
  expires_in: 1800,
  interval: 5,
}

/** Flush all pending microtasks / resolved promises */
const flushPromises = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

describe('AUTH-02 — uqr renderSVG produces valid SVG output', () => {
  it('renderSVG returns a string that contains <svg for a Twitch verification URL', () => {
    const url = 'https://www.twitch.tv/activate?device-code=ABCD1234'
    const svg = renderSVG(url)
    expect(typeof svg).toBe('string')
    expect(svg).toContain('<svg')
  })
})

describe('AUTH-02 — LoginScreen renders QR SVG in polling state', () => {
  let container: HTMLDivElement
  let dispose: () => void

  beforeEach(() => {
    mockNavigate.mockClear()
    mockSetFocus.mockClear()
    mockRequestDeviceCode.mockReset()
    mockPollForToken.mockReset()
    mockPersistTokens.mockReset()

    mockRequestDeviceCode.mockResolvedValue(MOCK_DEVICE_CODE_RESPONSE)
    mockPollForToken.mockResolvedValue('pending')

    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    dispose?.()
    document.body.removeChild(container)
    vi.restoreAllMocks()
  })

  it('injects an SVG element into the QR container when the screen enters polling state', async () => {
    dispose = render(() => <LoginScreen />, container)

    // Flush the microtask queue so the async requestDeviceCode promise resolves
    // and SolidJS re-renders the component into polling state.
    await flushPromises()

    // The QR div is the one with innerHTML set by renderSVG — search the entire
    // container HTML for the SVG marker.  happy-dom sets inline styles as
    // attribute strings, not computed RGB values, so we search innerHTML directly
    // rather than querying computed style properties.
    const html = container.innerHTML
    expect(
      html,
      `Expected container HTML to contain <svg after polling state is reached.\nActual HTML:\n${html}`
    ).toContain('<svg')
  })
})
