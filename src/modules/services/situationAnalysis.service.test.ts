import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  executeAnalysis,
  loadAnalysis,
  runAnalysisFlow,
} from '@/modules/services/situationAnalysis.service'

const executeSituationAnalysis = vi.fn()
const fetchSituationAnalysis = vi.fn()

vi.mock('@/modules/api/analysis.api', () => ({
  executeSituationAnalysis: (...args: unknown[]) =>
    executeSituationAnalysis(...args),
  fetchSituationAnalysis: (...args: unknown[]) =>
    fetchSituationAnalysis(...args),
  isAnalysisNotFoundError: (error: unknown) =>
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    (error as { status: number }).status === 404,
}))

const analysisPayload = {
  situationId: '6ce4e56e-4444-4444-8444-444444444444',
  sessionId: 'session-1',
  analysisVersion: 1,
  isLatest: true,
  createdAt: '2026-07-30T13:10:00.000Z',
  confidence: 0.91,
  analysis: {
    schemaVersion: '1',
    analyzedAt: '2026-07-30T13:10:00.000Z',
    provider: 'gemini',
    executiveSummary: {
      headline: 'Resumen',
      summary: 'Resumen ejecutivo',
      keyPoints: [],
    },
    incidentClassification: {
      categoryCode: 'TECH_DEGRADATION',
      categoryName: 'Degradación',
      operationalSeverity: 'MEDIUM',
      tags: [],
    },
    rootCause: { summary: 'Causa', hypotheses: [] },
    impactAssessment: {
      operationalSeverity: 'MEDIUM',
      confidence: 0.9,
      estimatedDurationMinutes: 60,
      summary: 'Impacto',
      reasoning: 'Razonamiento',
      affectedCoordinations: [],
      propagation: [],
    },
    recommendations: [],
    immediateRisks: [],
    futureRisks: [],
    missingInformation: [],
    executiveConclusion: {
      conclusion: 'Conclusión',
      recommendedNextStep: 'Siguiente paso',
    },
    confidence: { overall: 0.91, factors: [] },
  },
}

describe('situationAnalysis.service', () => {
  beforeEach(() => {
    executeSituationAnalysis.mockReset()
    fetchSituationAnalysis.mockReset()
  })

  it('ejecuta el análisis y devuelve la respuesta persistida sin polling', async () => {
    executeSituationAnalysis.mockResolvedValue(analysisPayload)

    const result = await runAnalysisFlow(analysisPayload.situationId)

    expect(executeSituationAnalysis).toHaveBeenCalledWith(
      analysisPayload.situationId,
    )
    expect(fetchSituationAnalysis).not.toHaveBeenCalled()
    expect(result.analysisVersion).toBe(1)
    expect(result.provider).toBe('gemini')
  })

  it('mapea executeAnalysis al formato de lectura del expediente', async () => {
    executeSituationAnalysis.mockResolvedValue(analysisPayload)

    const result = await executeAnalysis(analysisPayload.situationId)

    expect(result.sessionId).toBe('session-1')
    expect(result.updatedAt).toBe(analysisPayload.createdAt)
  })

  it('devuelve null cuando aún no existe análisis', async () => {
    fetchSituationAnalysis.mockRejectedValue({ status: 404 })

    const result = await loadAnalysis(analysisPayload.situationId)

    expect(result).toBeNull()
  })
})
