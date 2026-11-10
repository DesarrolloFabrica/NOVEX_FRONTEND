// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  bootstrapAuthSessionRequest,
  isInvalidSessionError,
  isTransientSessionError,
} from '@/modules/auth/services/auth-session.service'
import { writeAccessToken, clearAccessToken } from '@/modules/auth/utils/accessTokenStorage'
import { ApiError } from '@/shared/api/http'

const apiRequest = vi.fn()

vi.mock('@/shared/api/http', async () => {
  const actual = await vi.importActual<typeof import('@/shared/api/http')>(
    '@/shared/api/http',
  )
  return {
    ...actual,
    apiRequest: (...args: unknown[]) => apiRequest(...args),
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

describe('bootstrapAuthSessionRequest / clasificación de errores', () => {
  beforeEach(() => {
    window.localStorage.clear()
    apiRequest.mockReset()
    clearAccessToken()
  })

  afterEach(() => {
    clearAccessToken()
  })

  it('toma permisos vigentes de /auth/me', async () => {
    writeAccessToken(
      encodeClaims({
        sub: 'user-1',
        email: 'ana@cun.edu.co',
        roleId: 'role-1',
        roleCode: 'COORDINADOR',
        coordinationId: 'jwt-coord',
        permissions: ['SITUATIONS_CREATE', 'OLD_PERMISSION'],
        status: 'ACTIVE',
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    )

    apiRequest.mockResolvedValueOnce({
      user: {
        id: 'user-1',
        fullName: 'Ana',
        roleCode: 'COORDINADOR',
        roleName: 'Coordinador',
        coordinationId: 'me-coord',
        coordinationCode: 'coord-b2b',
        onboardingStep: 0,
        onboardingCompleted: true,
        onboardingSeenAt: null,
      },
      permissions: [{ id: 'p1', code: 'SITUATIONS_VIEW', name: 'Ver', module: 'S', description: null }],
    })

    const user = await bootstrapAuthSessionRequest()
    expect(user.permissions).toEqual(['SITUATIONS_VIEW'])
    expect(user.coordinationId).toBe('me-coord')
    expect(apiRequest).toHaveBeenCalledWith('/auth/me')
  })

  it('clasifica red/timeout/5xx como transitorios y 401/403 como sesión inválida', () => {
    expect(isTransientSessionError(new ApiError('red', 0, { code: 'NETWORK_ERROR' }))).toBe(
      true,
    )
    expect(isTransientSessionError(new ApiError('timeout', 0, { code: 'TIMEOUT' }))).toBe(
      true,
    )
    expect(isTransientSessionError(new ApiError('boom', 503))).toBe(true)
    expect(isTransientSessionError(new ApiError('no', 401))).toBe(false)
    expect(isInvalidSessionError(new ApiError('no', 401))).toBe(true)
    expect(isInvalidSessionError(new ApiError('inactive', 403))).toBe(true)
    expect(isInvalidSessionError(new ApiError('boom', 500))).toBe(false)
  })
})
