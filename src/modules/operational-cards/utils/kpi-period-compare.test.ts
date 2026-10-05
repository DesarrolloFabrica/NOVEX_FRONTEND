import { describe, expect, it } from 'vitest'
import {
  buildPreviousHistoryRange,
  formatCaseDelta,
  summarizeSeries,
} from '@/modules/operational-cards/utils/kpi-period-compare'

describe('kpi-period-compare', () => {
  it('calcula periodo anterior semanal de igual longitud', () => {
    const previous = buildPreviousHistoryRange(
      { from: '2026-01-05', to: '2026-01-25' },
      'week',
    )
    expect(previous.to).toBe('2026-01-04')
    expect(previous.from).toBe('2025-12-15')
  })

  it('formatea deltas neutrales', () => {
    expect(formatCaseDelta(3)).toBe('+3')
    expect(formatCaseDelta(-2)).toBe('-2')
    expect(formatCaseDelta(0)).toBe('0')
  })

  it('resume serie actual/min/max', () => {
    const summary = summarizeSeries([
      { value: 0 },
      { value: 5 },
      { value: 6 },
      { value: 6 },
    ])
    expect(summary).toEqual({
      current: 6,
      min: 0,
      max: 6,
      first: 0,
    })
  })
})
