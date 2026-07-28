import type {
  ExecuteAIAnalysisResponse,
  SituationAIAnalysisResponse,
} from '@/modules/api/types/analysis.types'
import { ApiError, apiRequest } from '@/shared/api/http'

export interface AnalysisSessionSummary {
  sessionId: string
  situationId: string
  analysisVersion: number
  isLatest: boolean
  provider: string
  model: string
  promptVersion: string
  confidence: number
  executionTimeMs: number
  tokenEstimate: number
  createdAt: string
}

export interface AnalysisHistoryResponse {
  situationId: string
  items: AnalysisSessionSummary[]
  total: number
  latestVersion: number | null
}

export async function executeSituationAnalysis(
  situationId: string,
): Promise<ExecuteAIAnalysisResponse> {
  return apiRequest<ExecuteAIAnalysisResponse>(
    `/situations/${situationId}/analyze`,
    { method: 'POST' },
  )
}

export async function fetchSituationAnalysis(
  situationId: string,
): Promise<SituationAIAnalysisResponse> {
  return apiRequest<SituationAIAnalysisResponse>(
    `/situations/${situationId}/analysis`,
  )
}

export async function fetchAnalysisHistory(
  situationId: string,
): Promise<AnalysisHistoryResponse> {
  return apiRequest<AnalysisHistoryResponse>(
    `/situations/${situationId}/analysis/history`,
  )
}

export async function tryFetchSituationAnalysis(
  situationId: string,
): Promise<SituationAIAnalysisResponse | null> {
  try {
    return await fetchSituationAnalysis(situationId)
  } catch (error) {
    if (isAnalysisNotFoundError(error)) return null
    throw error
  }
}

export function isAnalysisNotFoundError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404
}
