import type { CoordinationId } from '@/modules/impact-network/data/coordination-islands.config'
import type { SituationSeverity } from '@/modules/situations/types/situation.types'
import type { OperationalOverview } from '@/modules/operational-cards/types/operational-overview.contract'
import type {
  ProblemDetail,
  ProblemSectionId,
  ProblemSectionsState,
} from '@/modules/operational-cards/types/problem-detail.types'

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

  /** Problema abierto en la isla flotante. null = sin isla. */
  selectedProblemId: string | null
  level2: OperationalCardsLevel2State
  detailByProblem: ProblemDetailCache
}

/**
 * Rama de LEVEL 2. `problemId` dice a qué problema pertenece, de modo que una
 * respuesta que llega tarde tras cerrar la isla se descarta en el reducer.
 */
export interface OperationalCardsLevel2State {
  status: LoadState
  problemId: string | null
  detail: ProblemDetail | null
  errorMessage: string | null
  /** Secciones que necesitan su propia petición, con su propio estado. */
  sections: ProblemSectionsState
  /** Secciones desplegadas. El contenido se pide al abrirse por primera vez. */
  expanded: readonly ProblemSectionId[]
}

/** Caché de detalle y de secciones por problema, viva mientras el componente. */
export type ProblemDetailCache = Readonly<
  Partial<
    Record<
      string,
      { detail: ProblemDetail; sections: ProblemSectionsState }
    >
  >
>
