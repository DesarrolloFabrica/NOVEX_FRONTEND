import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ApiError } from '@/shared/api/http'
import type {
  AIAnalysisResult,
  ExecuteAIAnalysisResponse,
  SituationAIAnalysisResponse,
} from '@/modules/api/types/analysis.types'

const executeSituationAnalysis = vi.fn()
const fetchSituationAnalysis = vi.fn()
const fetchAnalysisHistory = vi.fn()

vi.mock('@/modules/api/analysis.api', async () => {
  const actual = await vi.importActual<typeof import('@/modules/api/analysis.api')>(
    '@/modules/api/analysis.api',
  )
  return {
    ...actual,
    executeSituationAnalysis: (...args: unknown[]) =>
      executeSituationAnalysis(...args),
    fetchSituationAnalysis: (...args: unknown[]) =>
      fetchSituationAnalysis(...args),
    fetchAnalysisHistory: (...args: unknown[]) => fetchAnalysisHistory(...args),
  }
})

const {
  describeAnalysisError,
  executeProblemAnalysis,
  loadProblemAnalysis,
  mapSituationAnalysisToView,
} = await import('@/modules/operational-cards/services/problem-analysis.service')

function analysisResult(): AIAnalysisResult {
  return {
    schemaVersion: '1',
    analyzedAt: '2026-01-01T00:00:00.000Z',
    provider: 'gemini',
    executiveSummary: {
      headline: 'Titular',
      summary: 'Resumen',
      keyPoints: ['Punto'],
    },
    incidentClassification: {
      categoryCode: 'NET',
      categoryName: 'Red',
      operationalSeverity: 'HIGH',
      tags: [],
    },
    rootCause: { summary: 'Causa', hypotheses: [] },
    impactAssessment: {
      operationalSeverity: 'HIGH',
      confidence: 0.8,
      estimatedDurationMinutes: 30,
      summary: 'Impacto',
      reasoning: 'Razon',
      affectedCoordinations: [
        {
          coordinationCode: 'coord-b2b',
          impactLevel: 'MEDIUM',
          description: 'Posible afectación',
        },
      ],
      propagation: [],
    },
    recommendations: [
      {
        title: 'Revisar enlace',
        description: 'Validar ruta',
        priority: 'HIGH',
      },
    ],
    immediateRisks: [
      {
        title: 'Caída parcial',
        description: 'Usuarios sin acceso',
        severity: 'HIGH',
      },
    ],
    futureRisks: [],
    missingInformation: [],
    executiveConclusion: {
      conclusion: 'Seguir',
      recommendedNextStep: 'Monitorear',
    },
    confidence: { overall: 0.77, factors: [] },
  }
}

describe('problem-analysis.service', () => {
  beforeEach(() => {
    executeSituationAnalysis.mockReset()
    fetchSituationAnalysis.mockReset()
    fetchAnalysisHistory.mockReset()
  })

  it('mapea el resultado vigente como sugerencia tipada', () => {
    const response: SituationAIAnalysisResponse = {
      situationId: 's1',
      sessionId: 'sess-1',
      analysisVersion: 2,
      isLatest: true,
      provider: 'gemini',
      analysis: analysisResult(),
      createdAt: '2026-01-02T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    }
    const view = mapSituationAnalysisToView(response)
    expect(view.headline).toBe('Titular')
    expect(view.suggestedCoordinations[0]?.coordinationCode).toBe('coord-b2b')
    expect(view.recommendations[0]?.title).toBe('Revisar enlace')
    expect(view.confidenceOverall).toBe(0.77)
  })

  it('traduce 409/422/503 a mensajes accionables', () => {
    expect(
      describeAnalysisError(
        new ApiError('busy', 409, { code: 'ANALYSIS_IN_PROGRESS' }),
      ),
    ).toMatch(/en curso/i)
    expect(
      describeAnalysisError(
        new ApiError('closed', 409, { code: 'SITUATION_CLOSED' }),
      ),
    ).toMatch(/cerrada|resuelta/i)
    expect(
      describeAnalysisError(
        new ApiError('cancelled', 409, { code: 'SITUATION_CANCELLED' }),
      ),
    ).toMatch(/anulada/i)
    expect(
      describeAnalysisError(
        new ApiError('large', 422, { code: 'PROMPT_TOO_LARGE' }),
      ),
    ).toMatch(/demasiada información/i)
    expect(describeAnalysisError(new ApiError('down', 503))).toMatch(
      /no está disponible/i,
    )
  })

  it('devuelve null cuando aún no hay análisis (404)', async () => {
    fetchSituationAnalysis.mockRejectedValueOnce(new ApiError('missing', 404))
    await expect(loadProblemAnalysis('s1')).resolves.toBeNull()
  })

  it('ejecuta análisis y mapea la respuesta', async () => {
    const response: ExecuteAIAnalysisResponse = {
      situationId: 's1',
      sessionId: 'sess-2',
      analysisVersion: 3,
      isLatest: true,
      createdAt: '2026-01-03T00:00:00.000Z',
      confidence: 0.9,
      analysis: analysisResult(),
    }
    executeSituationAnalysis.mockResolvedValueOnce(response)
    const view = await executeProblemAnalysis('s1')
    expect(view.analysisVersion).toBe(3)
    expect(view.confidenceOverall).toBe(0.9)
    expect(executeSituationAnalysis).toHaveBeenCalledWith('s1')
  })
})
