import { describe, expect, it } from 'vitest'
import {
  formatSlaDeadlineLabel,
  getSituationSlaHealth,
  getSlaActionRecommendation,
} from './situation-sla'

describe('situation-sla helpers', () => {
  it('marca overdue cuando dueAt ya pasó', () => {
    expect(
      getSituationSlaHealth({
        dueAt: '2020-01-01T00:00:00.000Z',
        status: 'OPEN',
        severity: 'HIGH',
      }),
    ).toBe('overdue')
  })

  it('recomienda pasar a En atención si está OPEN y at_risk', () => {
    const recommendation = getSlaActionRecommendation({
      status: 'OPEN',
      health: 'at_risk',
    })
    expect(recommendation).toMatch(/En atención/i)
  })

  it('formatea etiqueta de vencimiento', () => {
    const label = formatSlaDeadlineLabel(
      '2020-01-01T00:00:00.000Z',
      'overdue',
      new Date('2020-01-03T00:00:00.000Z'),
    )
    expect(label).toMatch(/Vencida/)
  })
})
