import {
  executeSituationAnalysis,
  fetchSituationAnalysis,
  isAnalysisNotFoundError,
} from '@/modules/api/analysis.api'
import type { SituationAIAnalysisResponse } from '@/modules/api/types/analysis.types'

export async function executeAnalysis(
  situationId: string,
): Promise<SituationAIAnalysisResponse> {
  const result = await executeSituationAnalysis(situationId)
  return {
    situationId: result.situationId,
    sessionId: result.sessionId,
    analysisVersion: result.analysisVersion,
    isLatest: result.isLatest,
    provider: result.analysis.provider,
    analysis: result.analysis,
    createdAt: result.createdAt,
    updatedAt: result.createdAt,
  }
}

export async function loadAnalysis(
  situationId: string,
): Promise<SituationAIAnalysisResponse | null> {
  try {
    return await fetchSituationAnalysis(situationId)
  } catch (error) {
    if (isAnalysisNotFoundError(error)) {
      return null
    }
    throw error
  }
}

export async function runAnalysisFlow(
  situationId: string,
): Promise<SituationAIAnalysisResponse> {
  return executeAnalysis(situationId)
}
