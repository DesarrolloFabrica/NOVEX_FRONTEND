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
  name: string
  role: 'supervisor' | 'ejecutor'
  selectedAreaId: string | null
  onboardingCompleted: boolean
  onboardingSeenAt: string | null
}

function toUser(payload: UserApiResponse, base?: User): User {
  return {
    id: payload.id,
    name: payload.name,
    role: payload.role,
    roleCode: base?.roleCode ?? 'COORDINADOR',
    permissions: base?.permissions ?? [],
    selectedAreaId: payload.selectedAreaId ?? base?.selectedAreaId,
    coordinationId: base?.coordinationId,
    onboardingCompleted: payload.onboardingCompleted,
    onboardingSeenAt: payload.onboardingSeenAt,
  }
}

export { loginWithEmailRequest } from '@/modules/auth/services/google-auth.service'

/** Marca el onboarding de primera vez como completado. */
export async function completeOnboardingRequest(
  user: User,
): Promise<User> {
  const response = await apiRequest<UserApiResponse>(
    `/users/${encodeURIComponent(user.id)}/onboarding/complete`,
    { method: 'PATCH' },
  )
  return toUser(response, user)
}

/** Cierra la sesión actual. */
export async function logoutRequest(): Promise<void> {
  clearAccessToken()
  clearAuthSession()
  await delay(200)
}
