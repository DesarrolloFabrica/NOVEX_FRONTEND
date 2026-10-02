import type { SituationEvidenceItem } from '@/modules/api/evidences.api'
import type { SituationTimelineEntry } from '@/modules/api/timeline.api'
import type {
  SituationReportKind,
  SituationSeverity,
} from '@/modules/situations/types/situation.types'
import type { LoadState } from '@/modules/operational-cards/types/operational-cards.state'

/**
 * Contrato de LEVEL 2: lo que el detalle necesita para responder «¿qué
 * ocurre exactamente con este problema?».
 *
 * Sin IA: no hay resumen ejecutivo, evaluación de impacto del análisis ni
 * recomendaciones. Todo lo que llega aquí lo registró una persona o lo produjo
 * el propio flujo operacional (estado, SLA, resolución).
 */

/**
 * Acordeones del detalle. «Notas del reporte» y «Otras evidencias» salen de la
 * MISMA carga de evidencias (se separan por tipo) y solo se pintan si tienen
 * contenido; «Cronología», siempre.
 */
export type ProblemSectionId = 'notes' | 'other-evidences' | 'timeline'

/** Orden congelado de los acordeones. */
export const PROBLEM_SECTION_ORDER: readonly ProblemSectionId[] = [
  'notes',
  'other-evidences',
  'timeline',
]

export interface ProblemDetail {
  id: string
  title: string
  severity: SituationSeverity
  status: string
  slaHealth: 'on_track' | 'at_risk' | 'overdue' | 'closed' | null
  dueAt: string | null
  /** Descripción tal como la escribió quien reportó el problema. */
  description: string
  createdAt: string
  /** Coordinación RESPONSABLE. `null` es «Sin coordinación», no un hueco. */
  coordinationCode: string | null
  coordinationName: string | null
  affectedCoordinationCode: string | null
  affectedCoordinationName: string | null
  reportKind: SituationReportKind
  affectedProcess: string | null
  pendingDelivery: string | null
  /** Autor del reporte, distinto de quien lo resuelve. */
  createdByUserName: string | null
  /**
   * Decisión del BACKEND sobre si este usuario puede resolver ESTE problema.
   * La interfaz solo la obedece; no la recalcula ni la deduce del rol.
   */
  canResolve: boolean
  /**
   * Decisión del BACKEND sobre OPEN → IN_PROGRESS. Independiente de
   * `canUpdate` (otras ediciones) y de `canResolve`.
   */
  canAdvanceToInProgress: boolean
  /**
   * Otras actualizaciones vía PATCH (autoría / ownership). No autoriza por
   * sí sola el botón «En atención».
   */
  canUpdate: boolean
  /** Aprendizaje y datos de resolución, si existen. */
  resolution: ProblemResolution | null
}

export interface ProblemResolution {
  learning: string
  resolvedByUserName: string
  resolvedAt: string | null
}

/** Estado de una sección que necesita su propia petición. */
export interface ProblemSectionState<T> {
  status: LoadState
  items: readonly T[]
  errorMessage: string | null
}

export interface ProblemSectionsState {
  evidences: ProblemSectionState<SituationEvidenceItem>
  timeline: ProblemSectionState<SituationTimelineEntry>
}

export const initialProblemSectionsState: ProblemSectionsState = {
  evidences: { status: 'idle', items: [], errorMessage: null },
  timeline: { status: 'idle', items: [], errorMessage: null },
}

/** Datos que se piden aparte de la situación, cada uno con su petición. */
export type LazyProblemSectionId = keyof ProblemSectionsState

/**
 * Datos que pide un acordeón al desplegarse. Las evidencias no están: se piden
 * en cuanto el detalle está listo, porque de ellas depende saber si las notas
 * existen, y eso no puede exigir abrir un acordeón que quizá esté vacío.
 */
export function lazyDataForSection(
  section: ProblemSectionId,
): LazyProblemSectionId | null {
  return section === 'timeline' ? 'timeline' : null
}
