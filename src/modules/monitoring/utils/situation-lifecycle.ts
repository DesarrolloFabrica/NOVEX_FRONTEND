import type { SituationResponse } from '@/modules/situations/types/situation.types'

export type SituationOperationalStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'CLOSED'

export const OPERATIONAL_STATUS_ORDER: SituationOperationalStatus[] = [
  'OPEN',
  'IN_PROGRESS',
  'RESOLVED',
  'CLOSED',
]

export const OPERATIONAL_STATUS_LABEL: Record<SituationOperationalStatus, string> = {
  OPEN: 'Registrada',
  IN_PROGRESS: 'En atención',
  RESOLVED: 'Resuelta',
  CLOSED: 'Cerrada',
}

/** Solo el estado inmediatamente siguiente del ciclo. */
export const OPERATIONAL_STATUS_TRANSITIONS: Record<
  SituationOperationalStatus,
  SituationOperationalStatus[]
> = {
  OPEN: ['IN_PROGRESS'],
  IN_PROGRESS: ['RESOLVED'],
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

export function getNextOperationalStatus(
  status: string,
): SituationOperationalStatus | null {
  const current = asOperationalStatus(status)
  return OPERATIONAL_STATUS_TRANSITIONS[current][0] ?? null
}

export function requiresStatusComment(status: SituationOperationalStatus): boolean {
  return status === 'RESOLVED' || status === 'CLOSED'
}

export function statusCommentLabel(status: SituationOperationalStatus): string {
  if (status === 'RESOLVED') return 'Motivo de resolución'
  if (status === 'CLOSED') return 'Comentario de cierre'
  return 'Comentario'
}

export function lifecyclePhase(
  status: string,
  step: SituationOperationalStatus,
): 'complete' | 'current' | 'pending' {
  const current = asOperationalStatus(status)
  const currentIndex = OPERATIONAL_STATUS_ORDER.indexOf(current)
  const stepIndex = OPERATIONAL_STATUS_ORDER.indexOf(step)
  if (stepIndex < currentIndex) return 'complete'
  if (stepIndex === currentIndex) return 'current'
  return 'pending'
}

export type UpdateSituationStatusInput = {
  status: SituationResponse['status']
  statusComment?: string
  evidenceIds?: string[]
}
