import { describe, expect, it } from 'vitest'
import {
  canExecuteSituationAnalysis,
  canViewSituationAnalysis,
} from '@/modules/operational-cards/data/analysisAccess'

describe('analysisAccess', () => {
  it('permite ver con AI_VIEW_REPORTS', () => {
    expect(
      canViewSituationAnalysis({ permissions: ['AI_VIEW_REPORTS'] }),
    ).toBe(true)
    expect(canViewSituationAnalysis({ permissions: [] })).toBe(false)
  })

  it('ejecuta solo con AI_ANALYZE y estado workable', () => {
    const analyst = { permissions: ['AI_ANALYZE'] }
    expect(canExecuteSituationAnalysis(analyst, 'OPEN')).toBe(true)
    expect(canExecuteSituationAnalysis(analyst, 'IN_PROGRESS')).toBe(true)
    expect(canExecuteSituationAnalysis(analyst, 'CLOSED')).toBe(false)
    expect(canExecuteSituationAnalysis(analyst, 'CANCELLED')).toBe(false)
    expect(canExecuteSituationAnalysis(analyst, 'RESOLVED')).toBe(false)
    expect(
      canExecuteSituationAnalysis(
        { permissions: ['AI_VIEW_REPORTS'] },
        'OPEN',
      ),
    ).toBe(false)
  })
})
