import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { ProblemAnalysisPanel } from '@/modules/operational-cards/components/ProblemAnalysisPanel'
import type { ProblemAnalysisView } from '@/modules/operational-cards/types/problem-analysis.types'
import { initialProblemAnalysisSectionState } from '@/modules/operational-cards/types/problem-analysis.types'
import type { AIAnalysisResult } from '@/modules/api/types/analysis.types'

function analysis(): AIAnalysisResult {
  return {
    schemaVersion: '1',
    analyzedAt: '2026-01-01T00:00:00.000Z',
    provider: 'gemini',
    executiveSummary: {
      headline: 'Titular sugerido',
      summary: 'Resumen sugerido',
      keyPoints: ['Punto A'],
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
      estimatedDurationMinutes: 10,
      summary: 'Impacto',
      reasoning: 'Razon',
      affectedCoordinations: [
        {
          coordinationCode: 'coord-b2b',
          impactLevel: 'MEDIUM',
          description: 'Posible eco',
        },
      ],
      propagation: [],
    },
    recommendations: [
      { title: 'Revisar', description: 'Paso 1', priority: 'HIGH' },
    ],
    immediateRisks: [
      { title: 'Riesgo', description: 'Detalle', severity: 'HIGH' },
    ],
    futureRisks: [],
    missingInformation: [],
    executiveConclusion: {
      conclusion: 'Ok',
      recommendedNextStep: 'Seguir',
    },
    confidence: { overall: 0.8, factors: [] },
  }
}

function view(): ProblemAnalysisView {
  const result = analysis()
  return {
    situationId: 's1',
    sessionId: 'sess',
    analysisVersion: 2,
    isLatest: true,
    provider: 'gemini',
    confidenceOverall: 0.8,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    headline: result.executiveSummary.headline,
    summary: result.executiveSummary.summary,
    keyPoints: result.executiveSummary.keyPoints,
    immediateRisks: result.immediateRisks,
    recommendations: result.recommendations,
    suggestedCoordinations: result.impactAssessment.affectedCoordinations,
    analysis: result,
  }
}

const idleSubmission = {
  kind: null,
  status: 'idle' as const,
  targetKey: null,
  errorMessage: null,
  confirmedButStale: false,
}

describe('ProblemAnalysisPanel', () => {
  it('etiqueta sugerencias y contrastas con hechos confirmados', () => {
    const html = renderToStaticMarkup(
      <ProblemAnalysisPanel
        situationId="s1"
        situationStatus="OPEN"
        analysis={{
          ...initialProblemAnalysisSectionState,
          status: 'ready',
          latest: view(),
          historyStatus: 'ready',
          history: [
            {
              sessionId: 'sess',
              situationId: 's1',
              analysisVersion: 2,
              isLatest: true,
              provider: 'gemini',
              model: 'x',
              promptVersion: '1',
              confidence: 0.8,
              executionTimeMs: 10,
              tokenEstimate: 1,
              createdAt: '2026-01-01T00:00:00.000Z',
            },
          ],
          historyLatestVersion: 2,
        }}
        expanded={['ai-analysis']}
        onToggleSection={() => undefined}
        canExecute
        submission={idleSubmission}
        onExecute={() => undefined}
        onRetry={() => undefined}
        onRetryHistory={() => undefined}
        confirmedConsequenceCount={3}
      />,
    )

    expect(html).toContain('Sugerencia de IA')
    expect(html).toContain('data-testid="analysis-confirmed-count"')
    expect(html).toContain('>3<')
    expect(html).toContain('sugerido')
    expect(html).toContain('Titular sugerido')
    expect(html).not.toContain('promptSnapshot')
    expect(html).toContain('Volver a analizar')
  })

  it('oculta ejecución en CLOSED y muestra historial', () => {
    const html = renderToStaticMarkup(
      <ProblemAnalysisPanel
        situationId="s1"
        situationStatus="CLOSED"
        analysis={{
          ...initialProblemAnalysisSectionState,
          status: 'ready',
          latest: view(),
          historyStatus: 'ready',
          history: [],
        }}
        expanded={['ai-analysis']}
        onToggleSection={() => undefined}
        canExecute={false}
        submission={idleSubmission}
        onExecute={vi.fn()}
        onRetry={() => undefined}
        onRetryHistory={() => undefined}
        confirmedConsequenceCount={0}
      />,
    )

    expect(html).toContain('analysis-closed-note')
    expect(html).not.toContain('analysis-execute')
  })

  it('muestra error de ejecución 409/503 sin filtrar prompt', () => {
    const html = renderToStaticMarkup(
      <ProblemAnalysisPanel
        situationId="s1"
        situationStatus="OPEN"
        analysis={{
          ...initialProblemAnalysisSectionState,
          status: 'ready',
          latest: null,
        }}
        expanded={['ai-analysis']}
        onToggleSection={() => undefined}
        canExecute
        submission={{
          kind: 'ai-analysis',
          status: 'error',
          targetKey: 's1',
          errorMessage: 'Ya hay un análisis en curso para esta situación.',
          confirmedButStale: false,
        }}
        onExecute={() => undefined}
        onRetry={() => undefined}
        onRetryHistory={() => undefined}
        confirmedConsequenceCount={0}
      />,
    )

    expect(html).toContain('analysis-execute-error')
    expect(html).toContain('análisis en curso')
    expect(html).not.toContain('promptSnapshot')
  })
})
