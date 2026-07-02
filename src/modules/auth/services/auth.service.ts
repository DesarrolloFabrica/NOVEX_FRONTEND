// Capa: servicios del módulo "auth".
// Responsabilidad: simular la comunicación con un backend de autenticación.
// Devuelve Promesas con un pequeño retardo para imitar latencia de red.
// Cuando exista API real, solo cambia ESTA capa; contextos y UI no se tocan.

import { AREAS } from '@/modules/areas/data/areas.mock'
import { findAreaById, isGlobalArea } from '@/modules/areas/utils/areas.utils'
import {
  SUPERVISOR_USER,
  buildEjecutorUser,
} from '@/modules/auth/data/users.mock'
import type { User } from '@/modules/auth/types/user.types'

/** Retardo artificial para simular una llamada de red. */
const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

/** Inicia sesión como supervisor (no requiere área). */
export async function loginAsSupervisorRequest(): Promise<User> {
  await delay(400)
  return SUPERVISOR_USER
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

  return buildEjecutorUser(areaId)
}

/** Cierra la sesión actual. */
export async function logoutRequest(): Promise<void> {
  await delay(200)
}
