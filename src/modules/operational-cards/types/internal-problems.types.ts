import type { SituationSeverity } from '@/modules/situations/types/situation.types'

/**
 * INTERNOS del Director: dos lecturas del mismo AnalysisPeriod.
 *
 *   GET /operational-kpis/internal-recurrence → FLUJO: INTERNAL creados por
 *     categoría y bucket (lámina RECURRENCIA).
 *   GET /operational-kpis/internal-problems   → FOTO AL CORTE: INTERNAL
 *     activos con sus agregados (lámina AFECTACIONES ACTIVAS).
 */

export type InternalProblemStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'

export type InternalProblemSla = 'on_track' | 'at_risk' | 'overdue' | 'none'

export interface InternosPeriod {
  kind: string
  from: string
  to: string
  calendarEnd: string
  dataTo: string
  isCurrent: boolean
  isPartial: boolean
  /** Corte T exclusivo (ISO). */
  cutAt: string
}

export interface InternalProblemRow {
  id: string
  title: string
  category: { id: string; code: string; name: string } | null
  createdAt: string
  createdByName: string | null
  /** Días desde el alta al corte (= Antigüedad). */
  ageDays: number
  statusAtCut: InternalProblemStatus
  reportedSeverity: SituationSeverity
  /** Vigente en el corte. */
  severityAtCut: SituationSeverity
  /** Afectaciones registradas antes del corte. */
  consequenceCountAtCut: number
  latestConsequence: {
    occurredAt: string
    createdAt: string
    preview: string
    truncated: boolean
  } | null
  dueAt: string | null
  slaAtCut: InternalProblemSla
  /** false = anterior a INTERNAL vivo: sin historial de afectaciones. */
  historyReliable: boolean
  /**
   * Afectaciones conocidas al corte (created_at < T), por occurred_at ↑.
   * Mismo conjunto que consequenceCountAtCut; vacío en legacy.
   */
  consequenceTimeline: InternalConsequenceMark[]
}

export interface InternalConsequenceMark {
  id: string
  occurredAt: string
  createdAt: string
  /** ≤ 140 caracteres. */
  preview: string
  truncated: boolean
  severityAtOccurrence: SituationSeverity
}

export interface InternalProblemsResponse {
  coordinationId: string
  period: InternosPeriod
  /** = Carga.active.internal del mismo corte. */
  total: number
  truncated: boolean
  /** Afectaciones ↓ · severidad ↓ · días abierto ↓ · id. */
  items: InternalProblemRow[]
}

export type InternalRecurrenceBucketKind = 'day' | 'week' | 'month'

export interface InternalRecurrenceBucket {
  start: string
  end: string
  /** Ventana que abre el drill-down. */
  calendarStart: string
  calendarEnd: string
  /** null = futuro. */
  dataEnd: string | null
  label: string
  current: boolean
  future: boolean
  /** INTERNAL creados en el bucket; null = futuro. */
  total: number | null
}

export interface InternalRecurrenceCategory {
  id: string
  code: string
  name: string
  selectable: boolean
  totalCreated: number
  bucketsWithOccurrences: number
  /** Alineado con `buckets`; null = futuro. */
  values: Array<number | null>
}

export interface InternalRecurrenceResponse {
  coordinationId: string
  period: InternosPeriod
  bucket: InternalRecurrenceBucketKind
  buckets: InternalRecurrenceBucket[]
  /** Buckets observados (no futuros). */
  eligibleBuckets: number
  /** INTERNAL creados en el periodo. */
  total: number
  /** Presencia ↓ · total ↓ · nombre. */
  categories: InternalRecurrenceCategory[]
}
