import type { AnalysisSessionSummary } from '@/modules/api/analysis.api'
import type {
  AIAnalysisResult,
  AffectedCoordinationResult,
  ImmediateRiskResult,
  RecommendationResult,
} from '@/modules/api/types/analysis.types'
import type { LoadState } from '@/modules/operational-cards/types/operational-cards.state'

/**
 * Vista de análisis IA para el detalle de Cartas.
 * Todo el contenido es SUGERENCIA: no sustituye severidad, estado ni responsable.
 */
export interface ProblemAnalysisView {
  situationId: string
  sessionId: string
  analysisVersion: number
  isLatest: boolean
  provider: string
  confidenceOverall: number
  createdAt: string
  updatedAt: string
  headline: string
  summary: string
  keyPoints: readonly string[]
  immediateRisks: readonly ImmediateRiskResult[]
  recommendations: readonly RecommendationResult[]
  suggestedCoordinations: readonly AffectedCoordinationResult[]
  /** Resultado completo para no perder campos; la UI solo pinta lo etiquetado. */
  analysis: AIAnalysisResult
}

export interface ProblemAnalysisSectionState {
  status: LoadState
  latest: ProblemAnalysisView | null
  errorMessage: string | null
  historyStatus: LoadState
  history: readonly AnalysisSessionSummary[]
  historyErrorMessage: string | null
  historyLatestVersion: number | null
}

export const initialProblemAnalysisSectionState: ProblemAnalysisSectionState = {
  status: 'idle',
  latest: null,
  errorMessage: null,
  historyStatus: 'idle',
  history: [],
  historyErrorMessage: null,
  historyLatestVersion: null,
}

/** Estados en los que el backend acepta un nuevo análisis. */
export const ANALYZABLE_SITUATION_STATUSES = ['OPEN', 'IN_PROGRESS'] as const

export type AnalyzableSituationStatus =
  (typeof ANALYZABLE_SITUATION_STATUSES)[number]

export function isAnalyzableSituationStatus(
  status: string | null | undefined,
): status is AnalyzableSituationStatus {
  return (
    status === 'OPEN' ||
    status === 'IN_PROGRESS'
  )
}
