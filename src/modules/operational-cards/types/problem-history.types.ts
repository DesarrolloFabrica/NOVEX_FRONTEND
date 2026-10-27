import type { SituationsListScope } from '@/modules/api/situations.api'
import type { SituationReportKind, SituationSeverity } from '@/modules/situations/types/situation.types'

/**
 * Entrada del historial de problemas CERRADOS en el panel derecho.
 * El listado pedirá `status=CLOSED` + intervalo de `closedAt` al servidor.
 */
export interface ProblemHistoryEntry {
  id: string
  title: string
  severity: SituationSeverity
  status: 'CLOSED'
  reportKind: SituationReportKind
  coordinationCode: string | null
  coordinationName: string | null
  affectedCoordinationCode: string | null
  affectedCoordinationName: string | null
  closedAt: string | null
  resolvedByUserName: string | null
  learningPreview: string | null
}

export interface ProblemHistoryPage {
  items: readonly ProblemHistoryEntry[]
  total: number
  page: number
  limit: number
  scope: SituationsListScope
}

/** Clase de período del filtro único «Período». */
export type HistoryPeriodKind = 'week' | 'month' | 'cycle'

/**
 * Período de cierre. `from`/`to` son fechas de calendario en Colombia
 * (`YYYY-MM-DD`); el servicio las convierte a límites inclusivos ISO.
 */
export interface ProblemHistoryPeriod {
  kind: HistoryPeriodKind
  /** week: `YYYY-Www`; month: `YYYY-MM`; cycle: `YYYY-H1` | `YYYY-H2`. */
  key: string
  from: string
  to: string
  /** Texto del control (p. ej. «Septiembre de 2026»). */
  label: string
  /** Texto para el resumen («en septiembre de 2026»). */
  summaryPhrase: string
}

export interface ProblemHistoryState {
  status: 'idle' | 'loading' | 'ready' | 'error'
  items: readonly ProblemHistoryEntry[]
  total: number
  page: number
  loadingMore: boolean
  errorMessage: string | null
  period: ProblemHistoryPeriod
  /** Coordinación con la que se pidió la página actual (UUID o null = global). */
  coordinationId: string | null
  scope: SituationsListScope
}
