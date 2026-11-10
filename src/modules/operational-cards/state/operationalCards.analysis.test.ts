import { describe, expect, it } from 'vitest'
import {
  initialOperationalCardsState,
  operationalCardsReducer,
} from '@/modules/operational-cards/state/operationalCards.reducer'
import type { ProblemAnalysisView } from '@/modules/operational-cards/types/problem-analysis.types'
import type { AIAnalysisResult } from '@/modules/api/types/analysis.types'
import type { ProblemDetail } from '@/modules/operational-cards/types/problem-detail.types'

function detail(over: Partial<ProblemDetail> = {}): ProblemDetail {
  return {
    id: 'p1',
    title: 'Incidente',
    severity: 'HIGH',
    reportedSeverity: 'HIGH',
    severityHistory: [],
    consequences: [],
    canAddConsequence: false,
    status: 'OPEN',
    slaHealth: null,
    dueAt: null,
    description: 'Desc',
    createdAt: '2026-01-01T00:00:00.000Z',
    coordinationCode: 'coord-b2b',
    coordinationName: 'B2B',
    affectedCoordinationCode: null,
    affectedCoordinationName: null,
    reportKind: 'INTERNAL',
    affectedProcess: null,
    pendingDelivery: null,
    createdByUserName: 'Ana',
    coordinationId: 'c1',
    affectedCoordinationId: null,
    canResolve: true,
    canAdvanceToInProgress: true,
    canUpdate: true,
    canCancel: false,
    canTransfer: false,
    resolution: null,
    cancellation: null,
    ...over,
  }
}

function analysisResult(): AIAnalysisResult {
  return {
    schemaVersion: '1',
    analyzedAt: '2026-01-01T00:00:00.000Z',
    provider: 'gemini',
    executiveSummary: {
      headline: 'H',
      summary: 'S',
      keyPoints: [],
    },
    incidentClassification: {
      categoryCode: 'X',
      categoryName: 'X',
      operationalSeverity: 'LOW',
      tags: [],
    },
    rootCause: { summary: '', hypotheses: [] },
    impactAssessment: {
      operationalSeverity: 'LOW',
      confidence: 0.5,
      estimatedDurationMinutes: 1,
      summary: '',
      reasoning: '',
      affectedCoordinations: [],
      propagation: [],
    },
    recommendations: [],
    immediateRisks: [],
    futureRisks: [],
    missingInformation: [],
    executiveConclusion: {
      conclusion: '',
      recommendedNextStep: '',
    },
    confidence: { overall: 0.5, factors: [] },
  }
}

function view(over: Partial<ProblemAnalysisView> = {}): ProblemAnalysisView {
  const analysis = analysisResult()
  return {
    situationId: 'p1',
    sessionId: 'sess',
    analysisVersion: 1,
    isLatest: true,
    provider: 'gemini',
    confidenceOverall: 0.5,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    headline: 'H',
    summary: 'S',
    keyPoints: [],
    immediateRisks: [],
    recommendations: [],
    suggestedCoordinations: [],
    analysis,
    ...over,
  }
}

function withDetail(state = initialOperationalCardsState) {
  return operationalCardsReducer(
    operationalCardsReducer(state, { type: 'SELECT_PROBLEM', problemId: 'p1' }),
    {
      type: 'LOAD_DETAIL_SUCCESS',
      problemId: 'p1',
      detail: detail(),
      generation: 0,
    },
  )
}

describe('operationalCardsReducer · análisis IA', () => {
  it('rechaza doble envío mientras hay análisis en curso', () => {
    const open = withDetail()
    const sending = operationalCardsReducer(open, {
      type: 'SUBMIT_AI_ANALYSIS',
      problemId: 'p1',
    })
    expect(sending.submission.status).toBe('sending')
    const again = operationalCardsReducer(sending, {
      type: 'SUBMIT_AI_ANALYSIS',
      problemId: 'p1',
    })
    expect(again).toBe(sending)
  })

  it('actualiza el análisis al confirmar execute y limpia historial para refetch', () => {
    const open = withDetail()
    const sending = operationalCardsReducer(open, {
      type: 'SUBMIT_AI_ANALYSIS',
      problemId: 'p1',
    })
    const ok = operationalCardsReducer(sending, {
      type: 'SUBMIT_AI_ANALYSIS_SUCCESS',
      problemId: 'p1',
      latest: view({ analysisVersion: 4 }),
    })
    expect(ok.level2.sections.analysis.latest?.analysisVersion).toBe(4)
    expect(ok.level2.sections.analysis.historyStatus).toBe('idle')
    expect(ok.submission.status).toBe('idle')
  })

  it('no aplica el análisis de otro problema al detalle actual', () => {
    const open = withDetail()
    const loading = operationalCardsReducer(open, {
      type: 'LOAD_ANALYSIS',
      problemId: 'p1',
    })
    const switched = operationalCardsReducer(loading, {
      type: 'SELECT_PROBLEM',
      problemId: 'p2',
    })
    const stale = operationalCardsReducer(switched, {
      type: 'LOAD_ANALYSIS_SUCCESS',
      problemId: 'p1',
      latest: view({ situationId: 'p1', headline: 'Obsoleto' }),
    })
    expect(stale.selectedProblemId).toBe('p2')
    expect(stale.level2.sections.analysis.latest).toBeNull()
    expect(stale.detailByProblem.p1?.sections.analysis.latest?.headline).toBe(
      'Obsoleto',
    )
  })

  it('guarda historial de versiones sin promptSnapshot', () => {
    const open = withDetail()
    const ready = operationalCardsReducer(open, {
      type: 'LOAD_ANALYSIS_HISTORY_SUCCESS',
      problemId: 'p1',
      latestVersion: 2,
      history: [
        {
          sessionId: 'a',
          situationId: 'p1',
          analysisVersion: 2,
          isLatest: true,
          provider: 'gemini',
          model: 'm',
          promptVersion: '1',
          confidence: 0.7,
          executionTimeMs: 1,
          tokenEstimate: 1,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    })
    expect(ready.level2.sections.analysis.history).toHaveLength(1)
    expect(JSON.stringify(ready.level2.sections.analysis)).not.toContain(
      'promptSnapshot',
    )
  })
})
