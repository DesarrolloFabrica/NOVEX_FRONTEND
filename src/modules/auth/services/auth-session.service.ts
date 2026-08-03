import type { User, UserRole } from '@/modules/auth/types/user.types'
import {
  clearAccessToken,
  readAccessToken,
  writeAccessToken,
} from '@/modules/auth/utils/accessTokenStorage'
import {
  decodeAccessTokenClaims,
  type AccessTokenClaims,
} from '@/modules/auth/utils/decodeAccessToken'
import { ApiError, apiRequest } from '@/shared/api/http'

export interface AuthUserSummary {
  id: string
  fullName: string
  roleCode: string
  coordinationId: string | null
  coordinationCode: string | null
}

interface AuthLoginResponse {
  accessToken: string
  expiresIn: string
  user: AuthUserSummary
}

interface AuthMeResponse {
  user: AuthUserSummary
}

export const AUTH_UNAUTHORIZED_MESSAGE =
  'Tu cuenta no está autorizada para acceder a NOVEX.'
export const AUTH_INACTIVE_MESSAGE = 'Tu usuario se encuentra inactivo.'

export function mapAuthError(error: unknown): Error {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return new Error(AUTH_UNAUTHORIZED_MESSAGE)
    }
    if (error.status === 403) {
      return new Error(AUTH_INACTIVE_MESSAGE)
    }
  }

  return error instanceof Error
    ? error
    : new Error('No fue posible iniciar sesión.')
}

function mapRoleCode(roleCode: string): UserRole {
  return roleCode === 'COORDINADOR' ? 'ejecutor' : 'supervisor'
}

function normalizeSummaryCoordinationId(
  value: string | null | undefined,
): string | undefined {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return undefined
  }
  return value
}

function normalizeSummaryCoordinationCode(
  value: string | null | undefined,
): string | undefined {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return undefined
  }
  return value
}

/**
 * Construye el usuario de sesión usando la coordinación embebida en el JWT
 * como fuente de verdad (sin coordinaciones mock en login).
 */
export function mapAuthUserToUser(
  summary: AuthUserSummary,
  claims: AccessTokenClaims,
): User {
  const roleCode = claims.roleCode || summary.roleCode
  const role = mapRoleCode(roleCode)
  const coordinationId =
    claims.coordinationId ??
    normalizeSummaryCoordinationId(summary.coordinationId)

  const coordinationCode = normalizeSummaryCoordinationCode(
    summary.coordinationCode,
  )

  return {
    id: claims.sub || summary.id,
    name: summary.fullName,
    role,
    roleCode,
    permissions: [...claims.permissions],
    // Código de coordinación real del backend para vistas de ejecutor.
    selectedAreaId: role === 'ejecutor' ? coordinationCode : undefined,
    coordinationId,
    onboardingCompleted: false,
    onboardingSeenAt: null,
  }
}

function requireTokenClaims(accessToken: string): AccessTokenClaims {
  const claims = decodeAccessTokenClaims(accessToken)
  if (!claims) {
    throw new Error('El token de acceso no es válido o está incompleto.')
  }
  return claims
}

export async function bootstrapAuthSessionRequest(): Promise<User> {
  const accessToken = readAccessToken()
  if (!accessToken) {
    throw new Error('No hay sesión activa.')
  }

  const claims = requireTokenClaims(accessToken)
  const meResponse = await apiRequest<AuthMeResponse>('/auth/me')
  return mapAuthUserToUser(meResponse.user, claims)
}

export async function loginWithCredentialsRequest(
  path: string,
  body: Record<string, string>,
): Promise<User> {
  let loginResponse: AuthLoginResponse

  try {
    loginResponse = await apiRequest<AuthLoginResponse>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  } catch (error) {
    throw mapAuthError(error)
  }

  writeAccessToken(loginResponse.accessToken)

  try {
    const claims = requireTokenClaims(loginResponse.accessToken)
    return mapAuthUserToUser(loginResponse.user, claims)
  } catch (error) {
    clearAccessToken()
    throw error instanceof Error ? error : mapAuthError(error)
  }
}
