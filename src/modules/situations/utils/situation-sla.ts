import type { SituationSeverity } from '@/modules/situations/types/situation.types'

export type SituationSlaHealth =
  | 'on_track'
  | 'at_risk'
  | 'overdue'
  | 'closed'

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

const SLA_WINDOWS: Record<
  SituationSeverity,
  { dueMs: number; warningMs: number }
> = {
  CRITICAL: { dueMs: 24 * HOUR_MS, warningMs: 6 * HOUR_MS },
  HIGH: { dueMs: 72 * HOUR_MS, warningMs: 24 * HOUR_MS },
  MEDIUM: { dueMs: 7 * DAY_MS, warningMs: 48 * HOUR_MS },
  LOW: { dueMs: 14 * DAY_MS, warningMs: 72 * HOUR_MS },
}

export function getSituationSlaHealth(input: {
  dueAt?: string | null
  status: string
  severity?: SituationSeverity | string | null
  now?: Date
}): SituationSlaHealth {
  if (input.status === 'CLOSED') return 'closed'
  if (!input.dueAt) return 'on_track'

  const dueMs = Date.parse(input.dueAt)
  if (!Number.isFinite(dueMs)) return 'on_track'

  const nowMs = (input.now ?? new Date()).getTime()
  if (nowMs > dueMs) return 'overdue'

  const severity = (input.severity ?? 'MEDIUM') as SituationSeverity
  const warningMs =
    SLA_WINDOWS[severity]?.warningMs ?? SLA_WINDOWS.MEDIUM.warningMs
  if (nowMs >= dueMs - warningMs) return 'at_risk'
  return 'on_track'
}

export function formatSlaDeadlineLabel(
  dueAt: string | null | undefined,
  health: SituationSlaHealth,
  now: Date = new Date(),
): string {
  if (!dueAt || health === 'closed') return 'Cerrada'
  const dueMs = Date.parse(dueAt)
  if (!Number.isFinite(dueMs)) return 'Sin plazo'

  const diffMs = dueMs - now.getTime()
  const abs = Math.abs(diffMs)
  const hours = Math.round(abs / HOUR_MS)
  const days = Math.round(abs / DAY_MS)

  if (diffMs < 0) {
    if (hours < 48) return `Vencida hace ${Math.max(1, hours)} h`
    return `Vencida hace ${Math.max(1, days)} d`
  }

  if (hours < 48) return `Vence en ${Math.max(1, hours)} h`
  return `Vence en ${Math.max(1, days)} d`
}

export function getSlaActionRecommendation(input: {
  status: string
  health: SituationSlaHealth
}): string | null {
  if (input.health === 'closed' || input.health === 'on_track') return null

  if (input.status === 'OPEN') {
    return input.health === 'overdue'
      ? 'El plazo venció. Pase a En atención y documente el avance o el cierre.'
      : 'El plazo está por vencer. Pase a En atención para tomar el caso.'
  }

  if (input.status === 'IN_PROGRESS' || input.status === 'RESOLVED') {
    return input.health === 'overdue'
      ? 'Documente el cierre con el resultado o actualice el seguimiento.'
      : 'El plazo está por vencer. Documente el cierre o deje una nota de seguimiento.'
  }

  return null
}

export const CLOSURE_COMMENT_TEMPLATES = [
  {
    id: 'resolved',
    label: 'Resuelto',
    text: 'Situación resuelta. Se restableció la operación normal.',
  },
  {
    id: 'mitigated',
    label: 'Mitigado',
    text: 'Impacto mitigado. Quedan acciones de seguimiento fuera de este expediente.',
  },
  {
    id: 'discarded',
    label: 'Descartado',
    text: 'Caso descartado tras verificación: no corresponde a una situación operativa activa.',
  },
  {
    id: 'transferred',
    label: 'Transferido',
    text: 'Caso transferido/escalado a la instancia competente. Se cierra el seguimiento local.',
  },
] as const
