// Capa: servicios del módulo "auth".
// Responsabilidad: simular login y sincronizar preferencias de onboarding
// con el backend (POST/PATCH /users). Si la API no está disponible, usa
// fallback local para no bloquear la demo.

import { AREAS } from '@/modules/areas/data/areas.mock'
import { findAreaById, isGlobalArea } from '@/modules/areas/utils/areas.utils'
import {
  SUPERVISOR_USER,
  buildEjecutorUser,
} from '@/modules/auth/data/users.mock'
import type { User } from '@/modules/auth/types/user.types'
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

function toUser(payload: UserApiResponse): User {
  return {
    id: payload.id,
    name: payload.name,
    role: payload.role,
    selectedAreaId: payload.selectedAreaId ?? undefined,
    onboardingCompleted: payload.onboardingCompleted,
    onboardingSeenAt: payload.onboardingSeenAt,
  }
}

async function ensureUserPreferences(user: User): Promise<User> {
  try {
    const response = await apiRequest<UserApiResponse>('/users/ensure', {
      method: 'POST',
      body: JSON.stringify({
        id: user.id,
        name: user.name,
        role: user.role,
        selectedAreaId: user.selectedAreaId ?? null,
      }),
    })
    return toUser(response)
  } catch {
    return user
  }
}

/** Inicia sesión como supervisor (no requiere área). */
export async function loginAsSupervisorRequest(): Promise<User> {
  await delay(400)
  return ensureUserPreferences(SUPERVISOR_USER)
}

/**
 * Inicia sesión como ejecutor de un área operativa.
 * Reglas de validación (propias del backend simulado):
 * - el área debe existir en el catálogo,
 * - no puede ser el área global (el ejecutor opera un área concreta).
 */
export async function loginAsEjecutorRequest(areaId: string): Promise<User> {
  await delay(400)

  const area = findAreaById(AREAS, areaId)
  if (!area) {
    throw new Error('El área seleccionada no existe.')
  }
  if (isGlobalArea(area)) {
    throw new Error('El rol ejecutor no puede operar sobre el área global.')
  }

  return ensureUserPreferences(buildEjecutorUser(areaId))
}

/** Marca el onboarding de primera vez como completado. */
export async function completeOnboardingRequest(
  user: User,
): Promise<User> {
  try {
    const response = await apiRequest<UserApiResponse>(
      `/users/${encodeURIComponent(user.id)}/onboarding/complete`,
      { method: 'PATCH' },
    )
    return toUser(response)
  } catch {
    return {
      ...user,
      onboardingCompleted: true,
      onboardingSeenAt: new Date().toISOString(),
    }
  }
}

/** Cierra la sesión actual. */
export async function logoutRequest(): Promise<void> {
  await delay(200)
}
