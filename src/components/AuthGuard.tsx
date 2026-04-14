import { Outlet, useNavigate } from '@solidjs/router'
import { createEffect } from 'solid-js'
import { authStore } from '../stores/authStore'

export default function AuthGuard() {
  const navigate = useNavigate()

  createEffect(() => {
    // Read authStore.token reactively — do NOT destructure
    if (!authStore.token) {
      navigate('/login', { replace: true })
    }
  })

  return <Outlet />
}
