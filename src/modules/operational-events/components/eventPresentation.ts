// Presentación de estados/riesgo del dominio Operational Events (solo UI).
// Sprint 9: chips tipográficos sin caja — menos ruido visual.

import type {
  OperationalEventStatus,
  RiskLevel,
} from '@/modules/operational-events/types/operational-event.types'

const CHIP = 'cunmark-exec-chip'

export const EVENT_STATUS_LABEL: Record<OperationalEventStatus, string> = {
  open: 'Abierto',
  monitoring: 'Seguimiento',
  resolved: 'Resuelto',
  archived: 'Archivado',
}

export const RISK_LEVEL_LABEL: Record<RiskLevel, string> = {
  low: 'Bajo',
  moderate: 'Moderado',
  high: 'Alto',
  critical: 'Crítico',
}

export const EVENT_STATUS_BADGE_CLASSES: Record<OperationalEventStatus, string> =
  {
    open: `${CHIP} text-sky-700`,
    monitoring: `${CHIP} text-amber-700`,
    resolved: `${CHIP} text-emerald-700`,
    archived: `${CHIP} text-slate-500`,
  }

export const RISK_LEVEL_BADGE_CLASSES: Record<RiskLevel, string> = {
  low: `${CHIP} text-emerald-700`,
  moderate: `${CHIP} text-amber-700`,
  high: `${CHIP} text-orange-700`,
  critical: `${CHIP} text-red-700`,
}

export function formatEventDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

export function eventRef(id: string): string {
  return id.replace(/^evt-/i, 'SIT-').toUpperCase()
}

const TIMELINE_TYPE_LABEL: Record<string, string> = {
  event_registered: 'Registro',
  interpretation_generated: 'Interpretación',
  status_change: 'Cambio de estado',
  note: 'Nota',
}

export function timelineTypeLabel(type: string): string {
  return TIMELINE_TYPE_LABEL[type] ?? type
}
