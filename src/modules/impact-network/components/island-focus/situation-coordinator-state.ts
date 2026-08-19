import {
  asOperationalStatus,
  OPERATIONAL_STATUS_LABEL,
  type SituationOperationalStatus,
} from '@/modules/monitoring/utils/situation-lifecycle'
import type { OperationalEvent } from '@/modules/operational-events/types/operational-event.types'
import type { SituationResponse } from '@/modules/situations/types/situation.types'

export type CoordinatorStateTone = 'open' | 'attention' | 'closed'

export interface SituationCoordinatorState {
  status: SituationOperationalStatus
  label: string
  tone: CoordinatorStateTone
  detail: string
}

function fromEventStatus(status: OperationalEvent['status']): SituationOperationalStatus {
  if (status === 'archived' || status === 'resolved') return 'CLOSED'
  if (status === 'monitoring') return 'IN_PROGRESS'
  return 'OPEN'
}

function hasCoordinatorMovement(
  event: OperationalEvent,
  situation?: Pick<SituationResponse, 'lastStatusComment'> | null,
): boolean {
  if (situation?.lastStatusComment?.trim()) return true
  return Boolean(
    event.timeline?.entries?.some(
      (entry) => entry.type === 'status_change' || entry.type === 'note',
    ),
  )
}

export function resolveSituationCoordinatorState(
  event: OperationalEvent,
  situation?: Pick<SituationResponse, 'status' | 'lastStatusComment'> | null,
): SituationCoordinatorState {
  const status = situation?.status
    ? asOperationalStatus(situation.status)
    : fromEventStatus(event.status)
  const label = OPERATIONAL_STATUS_LABEL[status]
  const moved = hasCoordinatorMovement(event, situation)

  if (status === 'CLOSED') {
    return {
      status,
      label,
      tone: 'closed',
      detail: 'El coordinador ya cerró esta situación.',
    }
  }

  if (status === 'IN_PROGRESS' || status === 'RESOLVED') {
    return {
      status,
      label,
      tone: 'attention',
      detail: 'El coordinador ya la tomó y está en gestión.',
    }
  }

  return {
    status,
    label,
    tone: 'open',
    detail: moved
      ? 'Sigue registrada: hay actividad, pero el coordinador aún no la tomó.'
      : 'Creada y quieta: el coordinador todavía no la ha actualizado.',
  }
}
