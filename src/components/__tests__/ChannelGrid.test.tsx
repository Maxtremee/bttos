// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from 'solid-js/web'
import type { JSX } from 'solid-js'

// Mock navigation
const mockSetFocus = vi.fn()
vi.mock('../../navigation', () => ({
  useSpatialNavigation: () => ({ setFocus: mockSetFocus }),
  FocusableGroup: (props: {
    focusKey?: string
    as?: string
    children: (() => unknown) | unknown
  }) => {
    const children = typeof props.children === 'function' ? props.children() : props.children
    return children as JSX.Element
  },
  Focusable: (props: {
    focusKey?: string
    as?: string
    onEnterPress?: () => void
    children: ((bag: { focused: () => boolean }) => unknown) | unknown
  }) => {
    const bag = { focused: () => false }
    const child = typeof props.children === 'function' ? props.children(bag) : props.children
    // Attach focusKey as data attribute for assertions
    const wrapper = document.createElement('div')
    wrapper.setAttribute('data-focus-key', props.focusKey ?? '')
    return child as JSX.Element
  },
}))

// Mock router
const mockNavigate = vi.fn()
vi.mock('@solidjs/router', () => ({
  useNavigate: () => mockNavigate,
}))

// Mock ChannelCard
vi.mock('../ChannelCard', () => ({
  default: (props: { channel: { user_login: string }; focused: boolean }) => (
    <div data-testid={props.channel.user_login} />
  ),
}))

import type { StreamData } from '../../services/TwitchChannelService'
import ChannelGrid from '../ChannelGrid'

const mockChannels: StreamData[] = [
  {
    user_id: '1',
    user_login: 'streamer_one',
    user_name: 'Streamer One',
    game_name: 'Game A',
    title: 'Stream title A',
    viewer_count: 1000,
    thumbnail_url: 'https://example.com/{width}x{height}.jpg',
    type: 'live',
    started_at: '2026-01-01T00:00:00Z',
  },
  {
    user_id: '2',
    user_login: 'streamer_two',
    user_name: 'Streamer Two',
    game_name: 'Game B',
    title: 'Stream title B',
    viewer_count: 2000,
    thumbnail_url: 'https://example.com/{width}x{height}.jpg',
    type: 'live',
    started_at: '2026-01-01T00:00:00Z',
  },
]

describe('ChannelGrid', () => {
  let container: HTMLDivElement
  let dispose: () => void

  beforeEach(() => {
    mockSetFocus.mockClear()
    mockNavigate.mockClear()
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    dispose?.()
    document.body.removeChild(container)
  })

  it('renders one ChannelCard per channel in the channels prop array', () => {
    dispose = render(() => <ChannelGrid channels={mockChannels} />, container)

    const card1 = container.querySelector('[data-testid="streamer_one"]')
    const card2 = container.querySelector('[data-testid="streamer_two"]')
    expect(card1).not.toBeNull()
    expect(card2).not.toBeNull()
  })

  it('renders no ChannelCard elements when channels array is empty', () => {
    dispose = render(() => <ChannelGrid channels={[]} />, container)

    const cards = container.querySelectorAll('[data-testid]')
    expect(cards.length).toBe(0)
  })

  it('grid container uses CSS module grid class', () => {
    dispose = render(() => <ChannelGrid channels={mockChannels} />, container)

    // Find div with the CSS module grid class (applied via styles.grid)
    const allDivs = container.querySelectorAll('div')
    let foundGrid = false
    allDivs.forEach((div) => {
      const cls = div.getAttribute('class') ?? ''
      if (cls.includes('grid')) {
        foundGrid = true
      }
    })
    expect(foundGrid).toBe(true)
  })

  it('renders the correct number of cards matching the channels prop length', () => {
    dispose = render(() => <ChannelGrid channels={mockChannels} />, container)

    const card1 = container.querySelector('[data-testid="streamer_one"]')
    const card2 = container.querySelector('[data-testid="streamer_two"]')
    expect(card1).not.toBeNull()
    expect(card2).not.toBeNull()
    // No extra cards
    const allTestIds = container.querySelectorAll('[data-testid]')
    expect(allTestIds.length).toBe(2)
  })
})
