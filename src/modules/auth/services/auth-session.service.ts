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
  roleName: string
  coordinationId: string | null
  coordinationCode: string | null
  onboardingStep?: number
  onboardingCompleted?: boolean
  onboardingSeenAt?: string | null
}

interface AuthLoginResponse {
  accessToken: string
  expiresIn: string
  user: AuthUserSummary
}

/** Permiso vigente expuesto por `/auth/me` (catálogo RBAC del backend). */
export interface AuthMePermission {
  id: string
  code: string
  name: string
  module: string
  description: string | null
}

interface AuthMeResponse {
  user: AuthUserSummary
  permissions: AuthMePermission[]
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

/**
 * Errores que confirman sesión inválida o usuario no usable: hay que limpiar
 * credenciales. Red, timeouts y 5xx NO entran aquí.
 */
export function isInvalidSessionError(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false
  return error.status === 401 || error.status === 403
}

/** Fallos transitorios: conviene conservar el token y reintentar. */
export function isTransientSessionError(error: unknown): boolean {
  if (!(error instanceof ApiError)) {
    // Errores de decodificación / contrato local no son transitorios.
    return false
  }
  if (error.status === 0) return true
  if (error.status >= 500) return true
  return error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT'
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

function normalizePermissionCodes(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

export interface MapAuthUserOptions {
  /**
   * Códigos de permiso vigentes. Cuando vienen de `/auth/me`, sustituyen a los
   * del JWT (que pueden estar desactualizados hasta 1 h).
   */
  permissions?: readonly string[]
}

/**
 * Construye el usuario de sesión.
 *
 * Rol, coordinación y permisos efectivos salen del resumen actual del backend
 * (`/auth/me` o login). Si `/auth/me` indica ausencia de coordinación, no se
 * reutiliza un valor antiguo del JWT.
 */
export function mapAuthUserToUser(
  summary: AuthUserSummary,
  claims: AccessTokenClaims,
  options: MapAuthUserOptions = {},
): User {
  const roleCode = summary.roleCode || claims.roleCode
  const role = mapRoleCode(roleCode)
  const coordinationId = normalizeSummaryCoordinationId(summary.coordinationId)
  const coordinationCode = normalizeSummaryCoordinationCode(
    summary.coordinationCode,
  )
  const permissions =
    options.permissions !== undefined
      ? normalizePermissionCodes([...options.permissions])
      : [...claims.permissions]

  return {
    id: summary.id || claims.sub,
    name: summary.fullName,
    role,
    roleCode,
    roleName: summary.roleName?.trim() ?? '',
    permissions,
    selectedAreaId: role === 'ejecutor' ? coordinationCode : undefined,
    coordinationId,
    onboardingStep: summary.onboardingStep ?? 0,
    onboardingCompleted: summary.onboardingCompleted ?? false,
    onboardingSeenAt: summary.onboardingSeenAt ?? null,
  }
}

function requireTokenClaims(accessToken: string): AccessTokenClaims {
  const claims = decodeAccessTokenClaims(accessToken)
  if (!claims) {
    throw new Error('El token de acceso no es válido o está incompleto.')
  }
  return claims
}

function permissionCodesFromMe(
  permissions: AuthMePermission[] | undefined,
): string[] {
  if (!Array.isArray(permissions)) return []
  return permissions
    .map((item) => item?.code)
    .filter((code): code is string => typeof code === 'string' && code.length > 0)
}

export async function bootstrapAuthSessionRequest(): Promise<User> {
  const accessToken = readAccessToken()
  if (!accessToken) {
    throw new Error('No hay sesión activa.')
  }

  const claims = requireTokenClaims(accessToken)
  const meResponse = await apiRequest<AuthMeResponse>('/auth/me')
  return mapAuthUserToUser(meResponse.user, claims, {
    permissions: permissionCodesFromMe(meResponse.permissions),
  })
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
    // Login: el JWT acaba de emitirse; los claims coinciden con el usuario.
    return mapAuthUserToUser(loginResponse.user, claims)
  } catch (error) {
    clearAccessToken()
    throw error instanceof Error ? error : mapAuthError(error)
  }
}
