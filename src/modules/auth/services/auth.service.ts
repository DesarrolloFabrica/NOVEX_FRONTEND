// Capa: servicios del módulo "auth".
// Responsabilidad: sincronizar preferencias de onboarding con el backend.

import type { User } from '@/modules/auth/types/user.types'
import { clearAccessToken } from '@/modules/auth/utils/accessTokenStorage'
import { clearAuthSession } from '@/modules/auth/utils/authSessionStorage'
import { apiRequest } from '@/shared/api/http'

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

interface UserApiResponse {
  id: string
  fullName: string
  roleCode: string
  roleName: string
  coordinationId: string | null
  coordinationCode: string | null
  onboardingStep: number
  onboardingCompleted: boolean
  onboardingSeenAt: string | null
}

function toUser(payload: UserApiResponse, base?: User): User {
  return {
    id: payload.id,
    name: payload.fullName,
    role: payload.roleCode === 'COORDINADOR' ? 'ejecutor' : 'supervisor',
    roleCode: payload.roleCode,
    roleName: payload.roleName,
    permissions: base?.permissions ?? [],
    selectedAreaId: payload.coordinationCode ?? base?.selectedAreaId,
    coordinationId: payload.coordinationId ?? base?.coordinationId,
    onboardingStep: payload.onboardingStep,
    onboardingCompleted: payload.onboardingCompleted,
    onboardingSeenAt: payload.onboardingSeenAt,
  }
}

export { loginWithEmailRequest } from '@/modules/auth/services/google-auth.service'

/** Marca el onboarding de primera vez como completado. */
export async function completeOnboardingRequest(user: User): Promise<User> {
  const response = await apiRequest<UserApiResponse>('/users/me/onboarding', {
    method: 'PATCH',
    body: JSON.stringify({ step: 100, completed: true }),
  })
  return toUser(response, user)
}

export async function saveOnboardingProgressRequest(
  user: User,
  step: number,
  completed?: boolean,
): Promise<User> {
  const response = await apiRequest<UserApiResponse>('/users/me/onboarding', {
    method: 'PATCH',
    body: JSON.stringify({ step, completed }),
  })
  return toUser(response, user)
}

/** Cierra la sesión actual. */
export async function logoutRequest(): Promise<void> {
  clearAccessToken()
  clearAuthSession()
  await delay(200)
}
