// Capa: datos (mock) del módulo "auth".
// Responsabilidad: proveer usuarios de ejemplo mientras no exista backend.
// El servicio de auth construye/recupera estos usuarios.

import { AREAS } from '@/modules/areas/data/areas.mock'
import { resolveAreaName } from '@/modules/areas/utils/areas.utils'
import type { User } from '@/modules/auth/types/user.types'

/** Usuario supervisor de ejemplo (observa la salud global y valida compromisos). */
export const SUPERVISOR_USER: User = {
  id: 'user-supervisor',
  name: 'Supervisora General',
  role: 'supervisor',
  onboardingCompleted: false,
  onboardingSeenAt: null,
}

/**
 * Construye un usuario ejecutor asociado a un área operativa.
 * El nombre se deriva del área para que la sesión sea reconocible en la UI.
 */
export function buildEjecutorUser(areaId: string): User {
  return {
    id: `user-ejecutor-${areaId}`,
    name: `Ejecutor · ${resolveAreaName(AREAS, areaId)}`,
    role: 'ejecutor',
    selectedAreaId: areaId,
    onboardingCompleted: false,
    onboardingSeenAt: null,
  }
}
