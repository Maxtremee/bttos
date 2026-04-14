import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from 'solid-js/web'

// Mock navigate
const mockNavigate = vi.fn()
vi.mock('@solidjs/router', () => ({
  useNavigate: () => mockNavigate,
}))

// Mock authStore — mutable so tests can set token
let mockToken: string | null = null
vi.mock('../../stores/authStore', () => ({
  get authStore() { return { token: mockToken } },
}))

// Import AFTER mocks
import AuthGuard from '../AuthGuard'

describe('AuthGuard', () => {
  beforeEach(() => {
    mockToken = null
    mockNavigate.mockClear()
  })

  it('calls navigate("/login", { replace: true }) when token is null', () => {
    mockToken = null
    const div = document.createElement('div')
    render(() => <AuthGuard />, div)
    expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true })
  })

  it('does NOT call navigate when token is present', () => {
    mockToken = 'valid_token'
    const div = document.createElement('div')
    render(() => <AuthGuard />, div)
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
