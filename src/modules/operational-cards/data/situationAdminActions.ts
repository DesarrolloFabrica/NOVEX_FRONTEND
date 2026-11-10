import type { ProblemDetail } from '@/modules/operational-cards/types/problem-detail.types'

/**
 * Disponibilidad de acciones administrativas según pistas del BACKEND.
 *
 * No se deduce del rol del frontend: sin `canCancel` / `canTransfer` la UI
 * no ofrece el botón aunque el usuario sea ADMIN.
 */
export function resolveSituationAdminActionAvailability(
  detail: Pick<ProblemDetail, 'canCancel' | 'canTransfer' | 'status'>,
): { canCancel: boolean; canTransfer: boolean } {
  const terminal = detail.status === 'CLOSED' || detail.status === 'CANCELLED'
  return {
    canCancel: !terminal && detail.canCancel === true,
    canTransfer: !terminal && detail.canTransfer === true,
  }
}
