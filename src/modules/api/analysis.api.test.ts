import { beforeEach, describe, expect, it, vi } from 'vitest'

const apiRequest = vi.fn()

vi.mock('@/shared/api/http', async () => {
  const actual = await vi.importActual<typeof import('@/shared/api/http')>(
    '@/shared/api/http',
  )
  return {
    ...actual,
    apiRequest: (...args: unknown[]) => apiRequest(...args),
  }
})

const {
  executeSituationAnalysis,
  fetchAnalysisByVersion,
  fetchAnalysisHistory,
  fetchSituationAnalysis,
} = await import('@/modules/api/analysis.api')

describe('analysis.api', () => {
  beforeEach(() => {
    apiRequest.mockReset()
  })

  it('POST analyze y GET analysis/history/version', async () => {
    apiRequest.mockResolvedValueOnce({ situationId: 's1' })
    await executeSituationAnalysis('s1')
    expect(apiRequest).toHaveBeenCalledWith('/situations/s1/analyze', {
      method: 'POST',
    })

    apiRequest.mockResolvedValueOnce({ situationId: 's1' })
    await fetchSituationAnalysis('s1')
    expect(apiRequest).toHaveBeenCalledWith('/situations/s1/analysis')

    apiRequest.mockResolvedValueOnce({ items: [], total: 0, latestVersion: null })
    await fetchAnalysisHistory('s1')
    expect(apiRequest).toHaveBeenCalledWith('/situations/s1/analysis/history')

    apiRequest.mockResolvedValueOnce({
      analysisVersion: 2,
      promptSnapshot: null,
      promptSnapshotWithheld: true,
    })
    await fetchAnalysisByVersion('s1', 2)
    expect(apiRequest).toHaveBeenCalledWith(
      '/situations/s1/analysis/history/2',
    )
  })
})
