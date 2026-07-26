// Tests del Motor de Inteligencia Operacional (funciones puras).

import { describe, expect, it } from 'vitest'
import { buildExecutiveNarrative } from '@/modules/operational-events/engine/executiveNarrative'
import { buildOperationalIntelligence } from '@/modules/operational-events/engine/operational-intelligence.engine'
import { resolveOperationalTrend } from '@/modules/operational-events/engine/operationalTrend'
import { OPERATIONAL_EVENTS } from '@/modules/operational-events/data/operational-events.mock'
import {
  selectDashboardHeadline,
  selectExecutiveNarrative,
  selectGlobalDashboardMetrics,
} from '@/modules/operational-events/selectors/operationalIntelligence.selectors'
import type {
  AIInterpretation,
  OperationalEvent,
  OperationalIndicator,
} from '@/modules/operational-events/types/operational-event.types'

let seq = 0

function makeInterpretation(
  overrides: Partial<AIInterpretation> &
    Pick<
      AIInterpretation,
      'categoryId' | 'categoryName' | 'riskScore' | 'riskLevel' | 'impactSeverity'
    >,
): AIInterpretation {
  seq += 1
  const eventId = overrides.eventId ?? `evt-test-${seq}`
  const indicator: OperationalIndicator = {
    id: `ind-${eventId}-1`,
    code: 'TEST_KPI',
    label: 'KPI de prueba',
    value: 1,
    unit: 'count',
    direction: 'higher_is_worse',
    suggestedByAI: true,
  }

  return {
    id: `ai-${eventId}`,
    eventId,
    affectedAreaIds: overrides.affectedAreaIds ?? ['area-fabrica-desarrollo'],
    affectedAreaNames: overrides.affectedAreaNames ?? [
      'Coordinador de Fábrica y Desarrollo',
    ],
    affectationPercentage: overrides.affectationPercentage ?? 50,
    impactInternal: overrides.impactInternal ?? 60,
    impactExternal: overrides.impactExternal ?? 30,
    impactStudents: overrides.impactStudents ?? 40,
    executiveSummary: overrides.executiveSummary ?? 'Resumen de prueba',
    narrative: overrides.narrative ?? 'Narrativa de prueba',
    suggestedIndicators: overrides.suggestedIndicators ?? [indicator],
    detectedPatterns: overrides.detectedPatterns ?? [],
    modelLabel: 'gemini-mock',
    interpretedAt: overrides.interpretedAt ?? '2026-07-20T12:00:00.000Z',
    confidence: overrides.confidence ?? 0.9,
    ...overrides,
  }
}

function makeEvent(
  overrides: Partial<OperationalEvent> & {
    interpretation: AIInterpretation | null
  },
): OperationalEvent {
  seq += 1
  const id = overrides.id ?? `evt-test-${seq}`
  return {
    id,
    title: overrides.title ?? `Evento ${id}`,
    description: overrides.description ?? 'Descripción de prueba',
    reportedBy: overrides.reportedBy ?? { id: 'u1', name: 'Tester' },
    reportedAt: overrides.reportedAt ?? '2026-07-20T12:00:00.000Z',
    sourceAreaId: overrides.sourceAreaId ?? 'area-fabrica-desarrollo',
    sourceAreaName:
      overrides.sourceAreaName ?? 'Coordinador de Fábrica y Desarrollo',
    status: overrides.status ?? 'open',
    interpretation: overrides.interpretation,
    timeline: overrides.timeline ?? { eventId: id, entries: [] },
    createdAt: overrides.createdAt ?? '2026-07-20T12:00:00.000Z',
    lastUpdateAt: overrides.lastUpdateAt,
  }
}

describe('buildOperationalIntelligence', () => {
  it('lista vacía => pending, narrativa de espera, sin críticos', () => {
    const metrics = buildOperationalIntelligence([], '2026-07-24T00:00:00.000Z')
    expect(metrics.totalEvents).toBe(0)
    expect(metrics.openCount).toBe(0)
    expect(metrics.criticalCount).toBe(0)
    expect(metrics.environment).toBe('pending')
    expect(metrics.trend).toBe('insufficient_data')
    expect(metrics.executiveNarrative).toContain('No hay situaciones operacionales')
    expect(metrics.generatedAt).toBe('2026-07-24T00:00:00.000Z')
  })

  it('calcula totales, impactos y críticos sobre eventos activos', () => {
    const metrics = buildOperationalIntelligence([
      makeEvent({
        status: 'open',
        reportedAt: '2026-07-10T00:00:00.000Z',
        interpretation: makeInterpretation({
          categoryId: 'cat-outage',
          categoryName: 'Caída de servicio',
          impactSeverity: 5,
          riskLevel: 'critical',
          riskScore: 90,
          impactInternal: 80,
          impactExternal: 40,
          impactStudents: 70,
        }),
      }),
      makeEvent({
        status: 'resolved',
        reportedAt: '2026-07-01T00:00:00.000Z',
        interpretation: makeInterpretation({
          categoryId: 'cat-delay',
          categoryName: 'Retraso operacional',
          impactSeverity: 2,
          riskLevel: 'low',
          riskScore: 20,
          impactInternal: 20,
          impactExternal: 10,
          impactStudents: 15,
        }),
      }),
    ])

    expect(metrics.totalEvents).toBe(2)
    expect(metrics.openCount).toBe(1)
    expect(metrics.resolvedCount).toBe(1)
    expect(metrics.criticalCount).toBe(1)
    expect(metrics.averageImpactInternal).toBe(80)
    expect(metrics.averageImpactExternal).toBe(40)
    expect(metrics.averageImpactStudents).toBe(70)
    expect(metrics.environment).toBe('critical')
    expect(metrics.operationalRiskLevel).toBe('critical')
    expect(metrics.byCategory.length).toBeGreaterThan(0)
    expect(metrics.byArea.length).toBeGreaterThan(0)
    expect(metrics.consolidatedIndicators.some((i) => i.code === 'EVT_OPEN')).toBe(
      true,
    )
    expect(metrics.executiveNarrative).toContain('mayor concentración')
  })

  it('procesa los mocks del dominio sin error', () => {
    const metrics = buildOperationalIntelligence(OPERATIONAL_EVENTS)
    expect(metrics.totalEvents).toBe(OPERATIONAL_EVENTS.length)
    expect(metrics.executiveNarrative.length).toBeGreaterThan(40)
    expect(metrics.consolidatedIndicators.length).toBeGreaterThan(5)
  })
})

describe('resolveOperationalTrend', () => {
  it('insufficient_data con menos de 3 eventos', () => {
    expect(
      resolveOperationalTrend([
        makeEvent({
          interpretation: makeInterpretation({
            categoryId: 'c',
            categoryName: 'C',
            riskScore: 40,
            riskLevel: 'moderate',
            impactSeverity: 3,
          }),
        }),
      ]),
    ).toBe('insufficient_data')
  })

  it('deteriorating cuando la mitad reciente tiene más riesgo', () => {
    const events = [
      makeEvent({
        reportedAt: '2026-07-01T00:00:00.000Z',
        interpretation: makeInterpretation({
          categoryId: 'c',
          categoryName: 'C',
          riskScore: 20,
          riskLevel: 'low',
          impactSeverity: 2,
        }),
      }),
      makeEvent({
        reportedAt: '2026-07-05T00:00:00.000Z',
        interpretation: makeInterpretation({
          categoryId: 'c',
          categoryName: 'C',
          riskScore: 25,
          riskLevel: 'low',
          impactSeverity: 2,
        }),
      }),
      makeEvent({
        reportedAt: '2026-07-20T00:00:00.000Z',
        interpretation: makeInterpretation({
          categoryId: 'c',
          categoryName: 'C',
          riskScore: 80,
          riskLevel: 'high',
          impactSeverity: 4,
        }),
      }),
      makeEvent({
        reportedAt: '2026-07-22T00:00:00.000Z',
        interpretation: makeInterpretation({
          categoryId: 'c',
          categoryName: 'C',
          riskScore: 85,
          riskLevel: 'critical',
          impactSeverity: 5,
        }),
      }),
    ]
    expect(resolveOperationalTrend(events)).toBe('deteriorating')
  })
})

describe('buildExecutiveNarrative', () => {
  it('menciona área, categoría e impacto predominante', () => {
    const text = buildExecutiveNarrative({
      totalEvents: 5,
      openCount: 3,
      criticalCount: 1,
      averageRiskScore: 55,
      operationalRiskLevel: 'high',
      trend: 'stable',
      dominantAreaName: 'Coordinador de Fábrica y Desarrollo',
      dominantCategoryName: 'Falla tecnológica',
      averageImpactInternal: 30,
      averageImpactExternal: 20,
      averageImpactStudents: 70,
    })
    expect(text).toContain('Coordinador de Fábrica y Desarrollo')
    expect(text).toContain('Falla tecnológica')
    expect(text).toContain('procesos académicos y estudiantes')
    expect(text).toContain('alto')
  })
})

describe('selectors', () => {
  it('selectGlobalDashboardMetrics y headline no recalculan campos inconsistentes', () => {
    const metrics = selectGlobalDashboardMetrics(OPERATIONAL_EVENTS)
    const headline = selectDashboardHeadline(metrics)
    expect(headline.totalEvents).toBe(metrics.totalEvents)
    expect(headline.executiveNarrative).toBe(selectExecutiveNarrative(metrics))
    expect(headline.environment).toBe(metrics.environment)
  })
})
