import type { CoordinationId } from '@/modules/impact-network/data/coordination-islands.config'
import type { SituationSeverity } from '@/modules/situations/types/situation.types'
import type { OperationalOverview } from '@/modules/operational-cards/types/operational-overview.contract'

/** Estado de carga, independiente por nivel: un fallo en LEVEL 1 no borra la baraja. */
export type LoadState = 'idle' | 'loading' | 'ready' | 'error'

/**
 * Estados de situación que cuentan como problema activo en el MVP.
 * Espejo de `ACTIVE_SITUATION_STATUSES` del backend; RESOLVED y CLOSED
 * quedan fuera de esta experiencia.
 */
export type ActiveSituationStatus = 'OPEN' | 'IN_PROGRESS'

/**
 * LEVEL 1. La carta activa solo MUESTRA título y severidad; el resto de
 * campos existen para ordenar (SLA, impacto, antigüedad) y no se pintan.
 */
export interface CoordinationProblem {
  id: string
  title: string
  severity: SituationSeverity
  status: ActiveSituationStatus
  createdAt: string
  slaHealth?: 'on_track' | 'at_risk' | 'overdue' | 'closed'
  affectedCoordinationCount?: number
}

/**
 * Caché de LEVEL 1 por coordinación: volver a una carta ya visitada no debe
 * costar una petición. La clave es el `code` de la coordinación.
 */
export type CoordinationProblemsCache = Readonly<
  Partial<Record<CoordinationId, readonly CoordinationProblem[]>>
>

/** Rama de LEVEL 1. `coordinationCode` dice a qué selección pertenece. */
export interface OperationalCardsLevel1State {
  status: LoadState
  coordinationCode: CoordinationId | null
  problems: readonly CoordinationProblem[]
  errorMessage: string | null
}

export interface OperationalCardsState {
  overview: OperationalOverview | null
  level0: LoadState
  errorMessage: string | null

  /** `code` de la coordinación seleccionada. null = estado global. */
  selectedCoordinationCode: CoordinationId | null
  /** `code` bajo el cursor o el foco. Solo alimenta la reacción del personaje. */
  hoveredCoordinationCode: CoordinationId | null

  level1: OperationalCardsLevel1State
  problemsByCoordination: CoordinationProblemsCache
}
