import type { SituationEvidenceItem } from '@/modules/api/evidences.api'
import type { SituationTimelineEntry } from '@/modules/api/timeline.api'
import type {
  SituationReportKind,
  SituationSeverity,
} from '@/modules/situations/types/situation.types'
import type { LoadState } from '@/modules/operational-cards/types/operational-cards.state'
import {
  initialProblemAnalysisSectionState,
  type ProblemAnalysisSectionState,
} from '@/modules/operational-cards/types/problem-analysis.types'

/**
 * Contrato de LEVEL 2: lo que el detalle necesita para responder «¿qué
 * ocurre exactamente con este problema?».
 *
 * El expediente operacional (estado, SLA, resolución, afectaciones confirmadas)
 * sigue siendo la fuente de hechos. La sección de análisis IA es sugerencia
 * contextual y no modifica esos hechos.
 */

/**
 * Acordeones del detalle. «Notas del reporte» y «Otras evidencias» salen de la
 * MISMA carga de evidencias (se separan por tipo) y solo se pintan si tienen
 * contenido; «Cronología» y «Análisis inteligente», siempre disponibles.
 */
export type ProblemSectionId =
  | 'notes'
  | 'other-evidences'
  | 'timeline'
  | 'ai-analysis'

/** Orden congelado de los acordeones. */
export const PROBLEM_SECTION_ORDER: readonly ProblemSectionId[] = [
  'notes',
  'other-evidences',
  'timeline',
  'ai-analysis',
]

/** Un nivel del historial de severidad, listo para la vista. */
export interface ProblemSeverityStep {
  id: string
  from: SituationSeverity | null
  to: SituationSeverity
  source: 'REPORTED' | 'AUTO_TIME'
  /** Desde cuándo rige. */
  effectiveAt: string
  /**
   * Historia QA simulada (`policy_code` `qa-*`): se rotula como tal para que
   * nadie la lea como el resultado de una política aprobada.
   */
  simulated: boolean
}

/** Una afectación del problema (append-only). */
export interface ProblemConsequence {
  id: string
  description: string
  occurredAt: string
  createdAt: string
  authorName: string | null
  authorRole: string | null
  /** Severidad vigente cuando ocurrió (la deriva el servidor). */
  severityAtOccurrence: SituationSeverity | null
}

export interface ProblemDetail {
  id: string
  title: string
  /** Severidad EFECTIVA: el nivel actual. */
  severity: SituationSeverity
  /** Severidad REPORTADA al registrar. Igual a `severity` si nunca cambió. */
  reportedSeverity: SituationSeverity
  /** Historial ascendente; la primera fila es la reportada. */
  severityHistory: readonly ProblemSeverityStep[]
  /** Afectaciones en orden de ocurrencia. Vacía es un estado legítimo. */
  consequences: readonly ProblemConsequence[]
  /**
   * Decisión del BACKEND sobre si este usuario puede registrar una afectación.
   * La interfaz no reconstruye la regla.
   */
  canAddConsequence: boolean
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
  /** Categoría del catálogo (`null` en INTER o en altas sin categoría). */
  categoryCode?: string | null
  categoryName?: string | null
  /** Categoría escrita por quien reportó al elegir «Otra». */
  categoryOtherText?: string | null
  /**
   * Coordinaciones que quien reportó declaró como relacionadas, en su orden.
   * Contexto: no son responsables ni impacto medido.
   */
  relatedCoordinations?: readonly ProblemRelatedCoordination[]
  /** Autor del reporte, distinto de quien lo resuelve. */
  createdByUserName: string | null
  /** UUID de la coordinación responsable (traslado / control optimista). */
  coordinationId: string | null
  /** UUID de la coordinación afectada (reglas INTER del traslado). */
  affectedCoordinationId: string | null
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
  /** Pista ADMIN: anular (`SITUATIONS_CANCEL`). No se deduce del rol FE. */
  canCancel: boolean
  /** Pista ADMIN: trasladar coordinación (`SITUATIONS_TRANSFER`). */
  canTransfer: boolean
  /** Aprendizaje y datos de resolución, si existen. */
  resolution: ProblemResolution | null
  /** Anulación administrativa, si existe. */
  cancellation: ProblemCancellation | null
}

export interface ProblemRelatedCoordination {
  coordinationId: string
  code: string
  name: string
}

/** Registro de anulación expuesto en el detalle. */
export interface ProblemCancellation {
  reason: string
  previousStatus: string
  cancelledByUserName: string
  cancelledAt: string
}

export interface ProblemResolution {
  learning: string
  resolvedByUserName: string
  /** `situations.resolved_at`: en filas legadas puede preceder al cierre. */
  resolvedAt: string | null
  /** Cierre del problema (`situations.closed_at`): la fecha que se muestra. */
  closedAt?: string | null
  /** Alta de la fila de aprendizaje. */
  recordedAt?: string | null
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
  analysis: ProblemAnalysisSectionState
}

export const initialProblemSectionsState: ProblemSectionsState = {
  evidences: { status: 'idle', items: [], errorMessage: null },
  timeline: { status: 'idle', items: [], errorMessage: null },
  analysis: initialProblemAnalysisSectionState,
}

/**
 * Datos lazy con forma de lista (`items`). El análisis IA usa su propio shape
 * (`sections.analysis`) y acciones dedicadas.
 */
export type LazyProblemSectionId = 'evidences' | 'timeline'

/**
 * Datos que pide un acordeón al desplegarse. Las evidencias no están: se piden
 * en cuanto el detalle está listo, porque de ellas depende saber si las notas
 * existen, y eso no puede exigir abrir un acordeón que quizá esté vacío.
 * El análisis vigente también se pide al quedar listo el detalle (si hay permiso).
 */
export function lazyDataForSection(
  section: ProblemSectionId,
): LazyProblemSectionId | null {
  return section === 'timeline' ? 'timeline' : null
}
