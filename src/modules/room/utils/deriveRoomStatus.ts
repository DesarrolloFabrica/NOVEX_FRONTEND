// Deriva el estado visual 2.5D de la sala (stable | attention | critical)
// desde el EnvironmentStatus del motor de salud. Solo presentación.

import type { EnvironmentStatus } from '@/modules/monitoring/types/monitoring.types'

/** Estados visuales de la escena 2.5D (iluminación reactiva de sala). */
export type RoomStatus = 'stable' | 'attention' | 'critical'

/**
 * Mapeo mínimo environment → roomStatus.
 * - critical: críticos / riesgo alto
 * - attention: pendientes / riesgo moderado
 * - stable: área controlada (healthy) o sin datos evaluados (pending)
 *
 * Override manual para pruebas:
 *   const roomStatus: RoomStatus = 'critical' // forzar escena
 */
export function deriveRoomStatus(
  environment: EnvironmentStatus | undefined | null,
): RoomStatus {
  switch (environment) {
    case 'critical':
      return 'critical'
    case 'attention':
      return 'attention'
    case 'healthy':
    case 'pending':
    default:
      return 'stable'
  }
}
