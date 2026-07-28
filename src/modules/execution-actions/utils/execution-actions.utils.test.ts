import { describe, expect, it } from 'vitest'
import {
  sortExecutionActions,
} from '@/modules/execution-actions/utils/execution-actions.utils'
import type { ExecutionAction } from '@/modules/execution-actions/types/execution-action.types'

function buildAction(
  overrides: Partial<ExecutionAction> & Pick<ExecutionAction, 'id'>,
): ExecutionAction {
  return {
    action: 'Acción de prueba',
    reason: 'Razón',
    whyRecommended: 'Porque mitiga el riesgo',
    priority: 'medium',
    recommendedTime: '1 hora',
    executionStatus: 'pending',
    statusNote: null,
    observation: null,
    suggestedAreaId: 'area-1',
    suggestedAreaCode: 'TEC',
    suggestedAreaName: 'Tecnologia',
    eventId: 'event-1',
    eventTitle: 'Situación de prueba',
    sourceAreaId: 'area-src',
    sourceAreaName: 'Registro',
    interpretationId: 'interp-1',
    generatedByAi: true,
    suggestedAt: '2026-07-22T09:00:00.000Z',
    riskIfNotExecuted: 'El riesgo continúa.',
    executiveSummary: 'Resumen ejecutivo.',
    expectedImpact: {
      benefitExpected: 'Recuperar el proceso',
      indicatorToImprove: 'Disponibilidad',
      estimatedTime: '1 hora',
      dependency: 'Plataforma',
      nextSuggestedAction: 'Verificar resultado',
    },
    timeline: [],
    createdAt: '2026-07-22T08:00:00.000Z',
    updatedAt: '2026-07-22T08:00:00.000Z',
    startedAt: null,
    completedAt: null,
    ...overrides,
  }
}

describe('execution-actions utils', () => {
  it('ordena por prioridad operativa', () => {
    const sorted = sortExecutionActions([
      buildAction({ id: '1', priority: 'scheduled' }),
      buildAction({ id: '2', priority: 'immediate' }),
      buildAction({ id: '3', priority: 'high' }),
    ])
    expect(sorted.map((item) => item.id)).toEqual(['2', '3', '1'])
  })
})
