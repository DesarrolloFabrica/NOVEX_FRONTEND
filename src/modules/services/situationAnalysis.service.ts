import {
  executeSituationAnalysis,
  fetchSituationAnalysis,
  isAnalysisNotFoundError,
} from '@/modules/api/analysis.api'
import type { SituationAIAnalysisResponse } from '@/modules/api/types/analysis.types'

const DEFAULT_POLL_INTERVAL_MS = 2_500
const DEFAULT_MAX_ATTEMPTS = 60

export interface PollAnalysisOptions {
  intervalMs?: number
  maxAttempts?: number
  signal?: AbortSignal
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Consulta cancelada.', 'AbortError'))
      return
    }

    const timeoutId = window.setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)

    function onAbort() {
      window.clearTimeout(timeoutId)
      reject(new DOMException('Consulta cancelada.', 'AbortError'))
    }

    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

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

export async function pollAnalysisUntilReady(
  situationId: string,
  options: PollAnalysisOptions = {},
): Promise<SituationAIAnalysisResponse> {
  const intervalMs = options.intervalMs ?? DEFAULT_POLL_INTERVAL_MS
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    options.signal?.throwIfAborted?.()

    const analysis = await loadAnalysis(situationId)
    if (analysis) {
      return analysis
    }

    if (attempt < maxAttempts - 1) {
      await delay(intervalMs, options.signal)
    }
  }

  throw new Error(
    'El análisis está tardando más de lo esperado. Intente de nuevo en unos momentos.',
  )
}

export async function runAnalysisFlow(
  situationId: string,
  options: PollAnalysisOptions = {},
): Promise<SituationAIAnalysisResponse> {
  await executeSituationAnalysis(situationId)
  return pollAnalysisUntilReady(situationId, options)
}
