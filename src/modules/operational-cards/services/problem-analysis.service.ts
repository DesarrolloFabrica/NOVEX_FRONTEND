import {
  executeSituationAnalysis,
  fetchAnalysisHistory,
  fetchSituationAnalysis,
  isAnalysisNotFoundError,
  type AnalysisHistoryResponse,
} from '@/modules/api/analysis.api'
import type {
  ExecuteAIAnalysisResponse,
  SituationAIAnalysisResponse,
} from '@/modules/api/types/analysis.types'
import type { ProblemAnalysisView } from '@/modules/operational-cards/types/problem-analysis.types'
import { ApiError } from '@/shared/api/http'

export function mapSituationAnalysisToView(
  response: SituationAIAnalysisResponse | ExecuteAIAnalysisResponse,
): ProblemAnalysisView {
  const analysis = response.analysis
  const confidenceOverall =
    typeof (response as ExecuteAIAnalysisResponse).confidence === 'number'
      ? (response as ExecuteAIAnalysisResponse).confidence
      : analysis.confidence.overall

  const createdAt = response.createdAt
  const updatedAt =
    'updatedAt' in response && typeof response.updatedAt === 'string'
      ? response.updatedAt
      : createdAt

  return {
    situationId: response.situationId,
    sessionId: response.sessionId,
    analysisVersion: response.analysisVersion,
    isLatest: response.isLatest,
    provider:
      'provider' in response && typeof response.provider === 'string'
        ? response.provider
        : analysis.provider,
    confidenceOverall,
    createdAt,
    updatedAt,
    headline: analysis.executiveSummary.headline,
    summary: analysis.executiveSummary.summary,
    keyPoints: analysis.executiveSummary.keyPoints,
    immediateRisks: analysis.immediateRisks,
    recommendations: analysis.recommendations,
    suggestedCoordinations: analysis.impactAssessment.affectedCoordinations,
    analysis,
  }
}

/**
 * Mensajes accionables según contratos reales del orquestador.
 * No inventa códigos: solo traduce los que el backend documenta.
 */
export function describeAnalysisError(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return error instanceof Error
      ? error.message
      : 'No pudimos completar el análisis inteligente.'
  }

  switch (error.code) {
    case 'ANALYSIS_IN_PROGRESS':
      return 'Ya hay un análisis en curso para esta situación. Espere a que termine antes de volver a intentarlo.'
    case 'ANALYSIS_CLAIM_LOST':
      return 'Se perdió el control del análisis en curso. Vuelva a intentarlo en unos segundos.'
    case 'SITUATION_CLOSED':
      return 'Esta situación ya está cerrada o resuelta y no admite un nuevo análisis.'
    case 'SITUATION_CANCELLED':
      return 'Esta situación está anulada y no admite un nuevo análisis.'
    case 'PROMPT_TOO_LARGE':
      return 'La situación tiene demasiada información para analizarse ahora. Reduzca evidencias o reintente más tarde.'
    case 'COORDINATION_REQUIRED':
      return 'Su usuario necesita una coordinación asignada para solicitar análisis.'
    default:
      break
  }

  if (error.status === 403) {
    return 'No tiene permiso para esta operación de análisis.'
  }
  if (error.status === 404) {
    return 'No encontramos la situación o el análisis solicitado.'
  }
  if (error.status === 409) {
    return error.message || 'El análisis no puede ejecutarse en el estado actual.'
  }
  if (error.status === 422) {
    return error.message || 'El análisis no pudo prepararse con la información actual de la situación.'
  }
  if (error.status === 503) {
    return 'El servicio de análisis no está disponible en este momento. Intente más tarde.'
  }
  if (error.status >= 500) {
    return 'El servicio de análisis falló temporalmente. Intente más tarde.'
  }

  return error.message || 'No pudimos completar el análisis inteligente.'
}

/**
 * Carga el análisis vigente. `null` = aún no hay informe: el backend responde
 * 204 (sin contenido); un 404 de una versión anterior se trata igual.
 */
export async function loadProblemAnalysis(
  situationId: string,
): Promise<ProblemAnalysisView | null> {
  try {
    const response = await fetchSituationAnalysis(situationId)
    if (!response) return null
    return mapSituationAnalysisToView(response)
  } catch (error) {
    if (isAnalysisNotFoundError(error)) return null
    throw error
  }
}

export async function executeProblemAnalysis(
  situationId: string,
): Promise<ProblemAnalysisView> {
  const response = await executeSituationAnalysis(situationId)
  return mapSituationAnalysisToView(response)
}

export async function loadProblemAnalysisHistory(
  situationId: string,
): Promise<AnalysisHistoryResponse> {
  return fetchAnalysisHistory(situationId)
}
