import { describe, it } from 'vitest'

// Implementation lives in src/components/AuthGuard.tsx (Wave 3, Plan 04)
describe('AuthGuard', () => {
  it.todo('renders <Outlet /> when authStore.token is non-null')
  it.todo('calls navigate("/login", { replace: true }) when authStore.token is null')
  it.todo('redirects reactively when token is cleared after mount')
})
