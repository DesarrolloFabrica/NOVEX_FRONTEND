import type { SituationResponse } from '@/modules/situations/types/situation.types'

export type SituationOperationalStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'CLOSED'

/** Etapas visibles del ciclo (3 pasos). RESOLVED es legado y no aparece aquí. */
export const OPERATIONAL_STATUS_ORDER: SituationOperationalStatus[] = [
  'OPEN',
  'IN_PROGRESS',
  'CLOSED',
]

export const OPERATIONAL_STATUS_LABEL: Record<SituationOperationalStatus, string> = {
  OPEN: 'Registrada',
  IN_PROGRESS: 'En atención',
  /** Valor legado: se presenta como En atención. */
  RESOLVED: 'En atención',
  CLOSED: 'Cerrada',
}

/**
 * Solo el estado inmediatamente siguiente del ciclo.
 * RESOLVED → CLOSED se conserva para filas históricas.
 */
export const OPERATIONAL_STATUS_TRANSITIONS: Record<
  SituationOperationalStatus,
  SituationOperationalStatus[]
> = {
  OPEN: ['IN_PROGRESS'],
  IN_PROGRESS: ['CLOSED'],
  RESOLVED: ['CLOSED'],
  CLOSED: [],
}

export function asOperationalStatus(
  status: string,
): SituationOperationalStatus {
  if (
    status === 'OPEN' ||
    status === 'IN_PROGRESS' ||
    status === 'RESOLVED' ||
    status === 'CLOSED'
  ) {
    return status
  }
  return 'OPEN'
}

/** Índice efectivo en la línea de 3 pasos (RESOLVED = En atención). */
function lifecycleIndex(status: SituationOperationalStatus): number {
  if (status === 'RESOLVED') {
    return OPERATIONAL_STATUS_ORDER.indexOf('IN_PROGRESS')
  }
  return OPERATIONAL_STATUS_ORDER.indexOf(status)
}

export function getNextOperationalStatus(
  status: string,
): SituationOperationalStatus | null {
  const current = asOperationalStatus(status)
  return OPERATIONAL_STATUS_TRANSITIONS[current][0] ?? null
}

export function requiresStatusComment(status: SituationOperationalStatus): boolean {
  return status === 'CLOSED'
}

export function statusCommentLabel(status: SituationOperationalStatus): string {
  if (status === 'CLOSED') return 'Motivo de cierre'
  return 'Comentario'
}

export function lifecyclePhase(
  status: string,
  step: SituationOperationalStatus,
): 'complete' | 'current' | 'pending' {
  const currentIndex = lifecycleIndex(asOperationalStatus(status))
  const stepIndex = lifecycleIndex(step)
  if (stepIndex < currentIndex) return 'complete'
  if (stepIndex === currentIndex) return 'current'
  return 'pending'
}

export type UpdateSituationStatusInput = {
  status: SituationResponse['status']
  statusComment?: string
  evidenceIds?: string[]
}
