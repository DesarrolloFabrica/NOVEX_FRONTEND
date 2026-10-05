import { describe, expect, it } from 'vitest'
import {
  analysisPeriodFromCycle,
  analysisPeriodFromMonth,
  analysisPeriodFromWeek,
  buildCurrentWeekPeriod,
  canNavigateNext,
  listWeeksInBrowseMonth,
  shiftAnalysisPeriod,
} from '@/modules/operational-cards/domain/analysis-period'

/** Jueves 1 oct 2026 Bogotá → semana lun 28 sep – dom 4 oct. */
const MID_WEEK = new Date('2026-10-01T15:00:00-05:00')

describe('analysis-period', () => {
  it('default es semana actual parcial a mitad de semana', () => {
    const period = buildCurrentWeekPeriod(MID_WEEK)
    expect(period.kind).toBe('week')
    expect(period.from).toBe('2026-09-28')
    expect(period.calendarEnd).toBe('2026-10-04')
    expect(period.to).toBe('2026-10-01')
    expect(period.isCurrent).toBe(true)
    expect(period.isPartial).toBe(true)
    expect(period.rangeLabel).toMatch(/SEP/i)
  })

  it('lista semanas que cruzan el mes', () => {
    const weeks = listWeeksInBrowseMonth(2026, 9) // octubre
    expect(weeks[0].from).toBe('2026-09-28')
    expect(weeks[0].to).toBe('2026-10-04')
    expect(weeks.some((w) => w.from === '2026-10-26')).toBe(true)
  })

  it('previous/next de semana', () => {
    const week = analysisPeriodFromWeek('2026-09-28', MID_WEEK)
    const prev = shiftAnalysisPeriod(week, -1, MID_WEEK)
    expect(prev.from).toBe('2026-09-21')
    const next = shiftAnalysisPeriod(week, 1, MID_WEEK)
    expect(next.from).toBe('2026-10-05')
  })

  it('no navega a periodos completamente futuros', () => {
    const current = buildCurrentWeekPeriod(MID_WEEK)
    expect(canNavigateNext(current, MID_WEEK)).toBe(false)
  })

  it('mes y ciclo construyen rangos calendario', () => {
    const month = analysisPeriodFromMonth(2026, 9, MID_WEEK)
    expect(month.from).toBe('2026-10-01')
    expect(month.calendarEnd).toBe('2026-10-31')
    expect(month.to).toBe('2026-10-01')
    expect(month.isPartial).toBe(true)

    const cycle = analysisPeriodFromCycle(2026, 2, MID_WEEK)
    expect(cycle.from).toBe('2026-07-01')
    expect(cycle.kindLabel).toBe('Ciclo H2')
  })
})
