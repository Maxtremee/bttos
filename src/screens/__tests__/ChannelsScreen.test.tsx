// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from 'solid-js/web'
import type { JSX } from 'solid-js'

// --- Module mocks ---

const mockSetFocus = vi.fn()
vi.mock('../../navigation', () => ({
  useSpatialNavigation: () => ({ setFocus: mockSetFocus }),
  Focusable: (props: {
    focusKey?: string
    as?: string
    onEnterPress?: () => void
    children: ((bag: { focused: () => boolean }) => unknown) | unknown
  }) => {
    const bag = { focused: () => false }
    return (typeof props.children === 'function' ? props.children(bag) : props.children) as JSX.Element
  },
}))

vi.mock('../../components/ChannelGrid', () => ({
  default: () => <div data-testid="channel-grid" />,
}))

const mockFetchLiveFollowedChannels = vi.fn()
vi.mock('../../services/TwitchChannelService', () => ({
  twitchChannelService: {
    get fetchLiveFollowedChannels() { return mockFetchLiveFollowedChannels },
  },
}))

import ChannelsScreen from '../ChannelsScreen'

// Flush microtasks — multiple rounds to handle chained promises
const flushPromises = async (rounds = 3) => {
  for (let i = 0; i < rounds; i++) {
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
  }
}

describe('ChannelsScreen', () => {
  let container: HTMLDivElement
  let dispose: () => void

  beforeEach(() => {
    mockSetFocus.mockClear()
    mockFetchLiveFollowedChannels.mockReset()
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    dispose?.()
    document.body.removeChild(container)
    vi.restoreAllMocks()
  })

  it('calls setInterval with a 60000ms interval on mount', async () => {
    mockFetchLiveFollowedChannels.mockResolvedValue([])
    const spy = vi.spyOn(globalThis, 'setInterval')

    dispose = render(() => <ChannelsScreen />, container)
    await flushPromises()

    expect(spy).toHaveBeenCalledWith(expect.any(Function), 60_000)
  })

  it('calls clearInterval with the timer ID on unmount', async () => {
    mockFetchLiveFollowedChannels.mockResolvedValue([])
    const mockTimerId = 999
    vi.spyOn(globalThis, 'setInterval').mockReturnValue(mockTimerId as unknown as ReturnType<typeof setInterval>)
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval')

    dispose = render(() => <ChannelsScreen />, container)
    await flushPromises()

    // Unmount
    dispose()
    dispose = undefined as unknown as () => void

    expect(clearIntervalSpy).toHaveBeenCalledWith(mockTimerId)
  })

  it('interval callback calls refetch (fetchLiveFollowedChannels again)', async () => {
    mockFetchLiveFollowedChannels.mockResolvedValue([])
    let capturedCallback: (() => void) | undefined
    vi.spyOn(globalThis, 'setInterval').mockImplementation(((cb: () => void) => {
      capturedCallback = cb
      return 1 as unknown as ReturnType<typeof setInterval>
    }) as typeof setInterval)

    dispose = render(() => <ChannelsScreen />, container)
    await flushPromises()

    const callCountBefore = mockFetchLiveFollowedChannels.mock.calls.length
    capturedCallback!()
    await flushPromises()

    expect(mockFetchLiveFollowedChannels.mock.calls.length).toBeGreaterThan(callCountBefore)
  })

  it('shows "Loading channels..." during initial load', async () => {
    // Never resolves — simulates loading
    mockFetchLiveFollowedChannels.mockReturnValue(new Promise(() => {}))

    dispose = render(() => <ChannelsScreen />, container)

    const text = container.textContent ?? ''
    expect(text).toContain('Loading channels...')
  })

  it('shows "No channels live right now" when fetch resolves with empty array', async () => {
    mockFetchLiveFollowedChannels.mockResolvedValue([])

    dispose = render(() => <ChannelsScreen />, container)
    await flushPromises()

    const text = container.textContent ?? ''
    expect(text).toContain('No channels live right now')
  })

  it('shows "Could not load channels" when fetch throws an error', async () => {
    // Use mockImplementation so we control the rejection timing and can suppress
    // the unhandled rejection before Vitest sees it.
    let rejectFn!: (e: Error) => void
    const controlledPromise = new Promise<never>((_resolve, reject) => {
      rejectFn = reject
    })
    // Attach a no-op catch to prevent "unhandled rejection" at creation time
    controlledPromise.catch(() => {})
    mockFetchLiveFollowedChannels.mockReturnValue(controlledPromise)

    dispose = render(() => <ChannelsScreen />, container)

    // Now reject — createResource will catch it internally
    rejectFn(new Error('Network error'))
    await flushPromises()

    const text = container.textContent ?? ''
    expect(text).toContain('Could not load channels')
  })
})
