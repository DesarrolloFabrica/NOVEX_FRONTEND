// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '@/modules/auth/context/AuthContext'
import { AuthContext } from '@/modules/auth/context/authContextObject'
import { useContext } from 'react'
import {
  clearAccessToken,
  readAccessToken,
  writeAccessToken,
} from '@/modules/auth/utils/accessTokenStorage'
import { writeAuthSession } from '@/modules/auth/utils/authSessionStorage'
import { ApiError } from '@/shared/api/http'

const bootstrapAuthSessionRequest = vi.fn()

vi.mock('@/modules/auth/services/auth-session.service', async () => {
  const actual = await vi.importActual<
    typeof import('@/modules/auth/services/auth-session.service')
  >('@/modules/auth/services/auth-session.service')
  return {
    ...actual,
    bootstrapAuthSessionRequest: (...args: unknown[]) =>
      bootstrapAuthSessionRequest(...args),
  }
})

function encodeClaims(claims: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }))
  const payload = btoa(JSON.stringify(claims))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
  return `${header}.${payload}.sig`
}

function Probe() {
  const auth = useContext(AuthContext)
  if (!auth) return null
  return (
    <div
      data-testid="probe"
      data-loading={String(auth.loading)}
      data-auth={String(auth.isAuthenticated)}
      data-retry={String(auth.canRetrySession)}
      data-error={auth.error ?? ''}
    />
  )
}

describe('AuthContext bootstrap FE-02/FE-03', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
    bootstrapAuthSessionRequest.mockReset()
    clearAccessToken()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
    clearAccessToken()
  })

  it('conserva el token ante error de red y permite reintentar', async () => {
    const token = encodeClaims({
      sub: 'user-1',
      email: 'ana@cun.edu.co',
      roleId: 'role-1',
      roleCode: 'COORDINADOR',
      coordinationId: 'coord-1',
      permissions: ['SITUATIONS_VIEW'],
      status: 'ACTIVE',
      exp: Math.floor(Date.now() / 1000) + 3600,
    })
    writeAccessToken(token)
    writeAuthSession({
      id: 'user-1',
      name: 'Ana',
      role: 'ejecutor',
      roleCode: 'COORDINADOR',
      roleName: 'Coordinador',
      permissions: ['SITUATIONS_VIEW'],
      coordinationId: 'coord-1',
      onboardingCompleted: true,
      onboardingStep: 100,
      onboardingSeenAt: null,
    })

    bootstrapAuthSessionRequest.mockRejectedValueOnce(
      new ApiError('red', 0, { code: 'NETWORK_ERROR' }),
    )

    await act(async () => {
      root.render(
        <AuthProvider>
          <Probe />
        </AuthProvider>,
      )
    })

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    const probe = container.querySelector('[data-testid="probe"]')
    expect(probe?.getAttribute('data-retry')).toBe('true')
    expect(probe?.getAttribute('data-auth')).toBe('true')
    expect(readAccessToken()).toBe(token)
  })

  it('limpia la sesión ante 401 y deja aviso de caducidad', async () => {
    const token = encodeClaims({
      sub: 'user-1',
      email: 'ana@cun.edu.co',
      roleId: 'role-1',
      roleCode: 'COORDINADOR',
      coordinationId: 'coord-1',
      permissions: ['SITUATIONS_VIEW'],
      status: 'ACTIVE',
      exp: Math.floor(Date.now() / 1000) + 3600,
    })
    writeAccessToken(token)
    writeAuthSession({
      id: 'user-1',
      name: 'Ana',
      role: 'ejecutor',
      roleCode: 'COORDINADOR',
      roleName: 'Coordinador',
      permissions: ['SITUATIONS_VIEW'],
      onboardingCompleted: true,
      onboardingStep: 100,
      onboardingSeenAt: null,
    })

    bootstrapAuthSessionRequest.mockRejectedValueOnce(
      new ApiError('unauthorized', 401),
    )

    await act(async () => {
      root.render(
        <AuthProvider>
          <Probe />
        </AuthProvider>,
      )
    })

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(readAccessToken()).toBeNull()
    expect(window.sessionStorage.getItem('novex.auth.sessionExpiry.v1')).toContain(
      'user-1',
    )
  })
})
