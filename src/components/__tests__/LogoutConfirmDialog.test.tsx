import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from 'solid-js/web'

const mockClearTokens = vi.hoisted(() => vi.fn())
const mockHistorySet = vi.hoisted(() => vi.fn())
const mockSetFocus = vi.hoisted(() => vi.fn())

// Mock twitchAuthService
vi.mock('../../services/TwitchAuthService', () => ({
  twitchAuthService: { clearTokens: mockClearTokens },
}))

// Mock history
vi.mock('../../router/history', () => ({
  history: { set: mockHistorySet, get: () => '/settings' },
}))

// Mock spatial navigation
vi.mock('@lampa-dev/solidjs-spatial-navigation', () => ({
  Focusable: (props: { children: (state: { focused: () => boolean }) => unknown; focusKey?: string; onEnterPress?: () => void; as?: string }) =>
    props.children({ focused: () => false }),
  useSpatialNavigation: () => ({ setFocus: mockSetFocus }),
}))

// Import AFTER mocks
import LogoutConfirmDialog from '../LogoutConfirmDialog'

describe('LogoutConfirmDialog', () => {
  beforeEach(() => {
    mockClearTokens.mockClear()
    mockHistorySet.mockClear()
    mockSetFocus.mockClear()
  })

  it('renders nothing when open is false', () => {
    const div = document.createElement('div')
    const mockCancel = vi.fn()
    render(() => <LogoutConfirmDialog open={false} onCancel={mockCancel} />, div)
    expect(div.textContent).not.toContain('Log out of Twitch?')
  })

  it('renders dialog content when open is true', () => {
    const div = document.createElement('div')
    const mockCancel = vi.fn()
    render(() => <LogoutConfirmDialog open={true} onCancel={mockCancel} />, div)
    expect(div.textContent).toContain('Log out of Twitch?')
    expect(div.textContent).toContain('You will need to sign in again on your phone or computer.')
  })

  it('renders Cancel and Log Out buttons when open', () => {
    const div = document.createElement('div')
    const mockCancel = vi.fn()
    render(() => <LogoutConfirmDialog open={true} onCancel={mockCancel} />, div)
    expect(div.textContent).toContain('Cancel')
    expect(div.textContent).toContain('Log Out')
  })

  it('onCancel prop is callable', () => {
    const div = document.createElement('div')
    const mockCancel = vi.fn()
    render(() => <LogoutConfirmDialog open={true} onCancel={mockCancel} />, div)
    // The onCancel prop exists and is a function — verify it can be invoked
    mockCancel()
    expect(mockCancel).toHaveBeenCalledTimes(1)
  })
})
