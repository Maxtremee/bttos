// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from 'solid-js/web'

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

// Flush microtasks
const flushPromises = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

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
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval')

    dispose = render(() => <ChannelsScreen />, container)
    await flushPromises()

    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 60_000)
  })

  it('calls clearInterval with the timer ID on unmount', async () => {
    mockFetchLiveFollowedChannels.mockResolvedValue([])
    const mockTimerId = 999
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval').mockReturnValue(mockTimerId as unknown as ReturnType<typeof setInterval>)
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
    let capturedCallback: (() => void) | null = null
    vi.spyOn(globalThis, 'setInterval').mockImplementation((cb) => {
      capturedCallback = cb as () => void
      return 1 as unknown as ReturnType<typeof setInterval>
    })

    dispose = render(() => <ChannelsScreen />, container)
    await flushPromises()

    const callCountBefore = mockFetchLiveFollowedChannels.mock.calls.length
    capturedCallback?.()
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
    mockFetchLiveFollowedChannels.mockRejectedValue(new Error('Network error'))

    dispose = render(() => <ChannelsScreen />, container)
    await flushPromises()

    const text = container.textContent ?? ''
    expect(text).toContain('Could not load channels')
  })
})
