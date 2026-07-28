import type { User, UserRole } from '@/modules/auth/types/user.types'
import {
  clearAccessToken,
  writeAccessToken,
} from '@/modules/auth/utils/accessTokenStorage'
import { ApiError, apiRequest } from '@/shared/api/http'

export interface AuthUserSummary {
  id: string
  fullName: string
  roleCode: string
  coordinationId: string
  coordinationCode: string
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
  'Tu cuenta no está autorizada para acceder a CUNMARK.'
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

export function mapAuthUserToUser(summary: AuthUserSummary): User {
  const role = mapRoleCode(summary.roleCode)

  return {
    id: summary.id,
    name: summary.fullName,
    role,
    selectedAreaId: role === 'ejecutor' ? summary.coordinationCode : undefined,
    coordinationId: summary.coordinationId,
    onboardingCompleted: false,
    onboardingSeenAt: null,
  }
}

export async function bootstrapAuthSessionRequest(): Promise<User> {
  const meResponse = await apiRequest<AuthMeResponse>('/auth/me')
  return mapAuthUserToUser(meResponse.user)
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
    const meResponse = await apiRequest<AuthMeResponse>('/auth/me')
    return mapAuthUserToUser(meResponse.user)
  } catch (error) {
    clearAccessToken()
    throw mapAuthError(error)
  }
}
