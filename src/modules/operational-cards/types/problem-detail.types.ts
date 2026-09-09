import type { SituationEvidenceItem } from '@/modules/api/evidences.api'
import type { SituationRecommendation } from '@/modules/api/recommendations.api'
import type { SituationTimelineEntry } from '@/modules/api/timeline.api'
import type { SituationSeverity } from '@/modules/situations/types/situation.types'
import type { LoadState } from '@/modules/operational-cards/types/operational-cards.state'

/**
 * Contrato de LEVEL 2: lo que la isla flotante necesita para responder «¿qué
 * ocurre exactamente con este problema?».
 *
 * Solo lectura. No hay campos para editar, cerrar, revalidar ni reanalizar: la
 * experiencia ADMIN no muta nada.
 *
 * `impact` e `ai` salen del MISMO análisis que se carga en la apertura, así
 * que abrir esas dos secciones no cuesta ninguna petición.
 */

export type ProblemSectionId =
  | 'impact'
  | 'ai'
  | 'recommendations'
  | 'evidences'
  | 'timeline'

/** Orden congelado de las secciones de la isla. */
export const PROBLEM_SECTION_ORDER: readonly ProblemSectionId[] = [
  'impact',
  'ai',
  'recommendations',
  'evidences',
  'timeline',
]

export interface ProblemImpactArea {
  coordinationCode: string
  impactLevel: SituationSeverity
  description: string
}

export interface ProblemImpact {
  summary: string
  areas: readonly ProblemImpactArea[]
  propagationDepth: number
}

export interface ProblemIntelligence {
  headline: string
  summary: string
  keyPoints: readonly string[]
  rootCause: string | null
  risks: readonly { title: string; severity: string }[]
}

export interface ProblemDetail {
  id: string
  title: string
  severity: SituationSeverity
  status: string
  slaHealth: 'on_track' | 'at_risk' | 'overdue' | 'closed' | null
  dueAt: string | null
  /** Resumen real: del análisis si existe, o de la descripción si no. */
  summary: string
  /** Contexto secundario; la coordinación ya se ve detrás. */
  coordinationName: string | null
  createdAt: string
  /** Null cuando la situación no tiene análisis IA (ocurre en ~20 %). */
  impact: ProblemImpact | null
  intelligence: ProblemIntelligence | null
}

/** Estado de una sección que necesita su propia petición. */
export interface ProblemSectionState<T> {
  status: LoadState
  items: readonly T[]
  errorMessage: string | null
}

export interface ProblemSectionsState {
  recommendations: ProblemSectionState<SituationRecommendation>
  evidences: ProblemSectionState<SituationEvidenceItem>
  timeline: ProblemSectionState<SituationTimelineEntry>
}

export const initialProblemSectionsState: ProblemSectionsState = {
  recommendations: { status: 'idle', items: [], errorMessage: null },
  evidences: { status: 'idle', items: [], errorMessage: null },
  timeline: { status: 'idle', items: [], errorMessage: null },
}

export type LazyProblemSectionId = keyof ProblemSectionsState

export function isLazySection(
  section: ProblemSectionId,
): section is LazyProblemSectionId {
  return (
    section === 'recommendations' ||
    section === 'evidences' ||
    section === 'timeline'
  )
}
