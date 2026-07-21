// Utilidades de validación diferida por área.
// La UI califica en borrador; el estado del área solo cambia al aplicar.

import type {
  Commitment,
  CommitmentStatus,
} from '@/modules/commitments/types/commitment.types'

export function isRatedCommitmentStatus(
  status: CommitmentStatus | undefined,
): status is 'Cumplido' | 'Incumplido' {
  return status === 'Cumplido' || status === 'Incumplido'
}

/** Estado visible en consola y paneles (borrador prevalece sobre el aplicado). */
export function getCommitmentDisplayStatus(
  commitment: Commitment,
): CommitmentStatus {
  return commitment.draftStatus ?? commitment.status
}

/** Todos los compromisos del área tienen calificación en borrador. */
export function isAreaFullyDraftRated(commitments: Commitment[]): boolean {
  if (commitments.length === 0) return false
  return commitments.every((commitment) =>
    isRatedCommitmentStatus(commitment.draftStatus),
  )
}

/** Hay borradores pendientes de consolidar en el estado oficial del área. */
export function hasAreaPendingApplication(commitments: Commitment[]): boolean {
  return commitments.some(
    (commitment) =>
      commitment.status === 'Pendiente de validación' &&
      isRatedCommitmentStatus(commitment.draftStatus),
  )
}

/** El supervisor puede aplicar la validación del área enfocada. */
export function canApplyAreaValidation(commitments: Commitment[]): boolean {
  return (
    isAreaFullyDraftRated(commitments) && hasAreaPendingApplication(commitments)
  )
}
