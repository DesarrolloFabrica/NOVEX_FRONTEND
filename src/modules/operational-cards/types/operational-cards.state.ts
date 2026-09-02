import type { CoordinationId } from '@/modules/impact-network/data/coordination-islands.config'
import type { SituationSeverity } from '@/modules/situations/types/situation.types'
import type { OperationalOverview } from '@/modules/operational-cards/types/operational-overview.contract'

/**
 * Contratos de estado de la experiencia. Solo los tipos; el reducer se
 * implementa en una fase posterior.
 */

/** Estado de carga, independiente por nivel: un fallo en LEVEL 1 no borra la baraja. */
export type LoadState = 'idle' | 'loading' | 'ready' | 'error'

/**
 * Estados de situación que cuentan como problema activo en el MVP.
 * Espejo de `ACTIVE_SITUATION_STATUSES` del backend; RESOLVED y CLOSED
 * quedan fuera de esta experiencia.
 */
export type ActiveSituationStatus = 'OPEN' | 'IN_PROGRESS'

/** LEVEL 1: lo mínimo que la carta activa muestra por problema. */
export interface CoordinationProblemSummary {
  id: string
  title: string
  severity: SituationSeverity
  status: ActiveSituationStatus
}

/**
 * Caché de LEVEL 1 por coordinación: volver a una carta ya visitada no debe
 * costar una petición. La clave es el `code` de la coordinación.
 */
export type CoordinationProblemsCache = Readonly<
  Partial<Record<CoordinationId, readonly CoordinationProblemSummary[]>>
>

export interface OperationalCardsState {
  overview: OperationalOverview | null
  level0: LoadState

  /** `code` de la coordinación seleccionada. null = estado global. */
  selectedCoordinationCode: CoordinationId | null
  level1: LoadState
  problemsByCoordination: CoordinationProblemsCache

  /** Situación abierta en la isla flotante. */
  selectedProblemId: string | null
  level2: LoadState
}
