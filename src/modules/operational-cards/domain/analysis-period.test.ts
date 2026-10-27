import { describe, expect, it } from 'vitest'
import {
  analysisPeriodFromCycle,
  analysisPeriodFromMonth,
  analysisPeriodFromWeek,
  analysisPeriodTrail,
  buildCurrentCyclePeriod,
  buildCurrentWeekPeriod,
  canNavigateNext,
  containingCyclePeriod,
  cycleHalfOf,
  drillIntoPeriod,
  parentAnalysisPeriod,
  listWeeksInBrowseMonth,
  refreshAnalysisPeriod,
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

/** Martes 6 oct 2026 Bogotá. */
const NOW = new Date('2026-10-06T12:00:00-05:00')

describe('analysis-period · navegación mensual', () => {
  const shiftMonth = (year: number, monthIndex: number, direction: -1 | 1) => {
    const period = analysisPeriodFromMonth(year, monthIndex, NOW)
    return shiftAnalysisPeriod(period, direction, NOW)
  }

  it('octubre 2026 ‹ → septiembre 2026', () => {
    const prev = shiftMonth(2026, 9, -1)
    expect(prev).toMatchObject({
      kind: 'month',
      from: '2026-09-01',
      calendarEnd: '2026-09-30',
      navigationContext: { year: 2026, month: 8 },
    })
  })

  it('octubre 2026 › → noviembre 2026', () => {
    const next = shiftMonth(2026, 9, 1)
    expect(next).toMatchObject({
      kind: 'month',
      from: '2026-11-01',
      calendarEnd: '2026-11-30',
      navigationContext: { year: 2026, month: 10 },
    })
  })

  it('enero 2026 ‹ → diciembre 2025', () => {
    const prev = shiftMonth(2026, 0, -1)
    expect(prev).toMatchObject({
      from: '2025-12-01',
      calendarEnd: '2025-12-31',
      navigationContext: { year: 2025, month: 11 },
    })
  })

  it('diciembre 2025 › → enero 2026', () => {
    const next = shiftMonth(2025, 11, 1)
    expect(next).toMatchObject({
      from: '2026-01-01',
      calendarEnd: '2026-01-31',
      navigationContext: { year: 2026, month: 0 },
    })
  })

  it('next se deshabilita en el mes actual (noviembre 2026 sería futuro)', () => {
    expect(canNavigateNext(analysisPeriodFromMonth(2026, 9, NOW), NOW)).toBe(false)
    expect(canNavigateNext(analysisPeriodFromMonth(2026, 8, NOW), NOW)).toBe(true)
  })

  it('next se deshabilita en el ciclo actual; ciclo ‹ cruza de año', () => {
    const h2 = analysisPeriodFromCycle(2026, 2, NOW)
    expect(canNavigateNext(h2, NOW)).toBe(false)
    const h1 = shiftAnalysisPeriod(analysisPeriodFromCycle(2026, 1, NOW), -1, NOW)
    expect(h1).toMatchObject({
      from: '2025-07-01',
      navigationContext: { year: 2025, half: 2 },
    })
  })
})

describe('analysis-period · contexto de navegación', () => {
  it('la semana actual usa el mismo contexto que la semana elegida (mes del jueves)', () => {
    // Jueves 1 oct 2026 → semana 28 sep – 4 oct: contexto octubre.
    const current = buildCurrentWeekPeriod(MID_WEEK)
    const picked = analysisPeriodFromWeek('2026-09-28', MID_WEEK)
    expect(current.navigationContext).toEqual({ year: 2026, month: 9 })
    expect(current).toEqual(picked)
  })

  it('cycleHalfOf deriva H1/H2 del periodo', () => {
    expect(cycleHalfOf(analysisPeriodFromMonth(2025, 2, NOW))).toBe(1)
    expect(cycleHalfOf(analysisPeriodFromWeek('2025-10-13', NOW))).toBe(2)
    expect(cycleHalfOf(analysisPeriodFromCycle(2025, 2, NOW))).toBe(2)
  })
})

describe('analysis-period · revalidación de actual / parcial', () => {
  it('devuelve la misma referencia si nada cambió', () => {
    const week = buildCurrentWeekPeriod(NOW)
    expect(refreshAnalysisPeriod(week, NOW)).toBe(week)
  })

  it('al día siguiente amplía `to` dentro de la semana actual', () => {
    const week = buildCurrentWeekPeriod(NOW)
    const tomorrow = new Date('2026-10-07T09:00:00-05:00')
    const fresh = refreshAnalysisPeriod(week, tomorrow)
    expect(fresh).not.toBe(week)
    expect(fresh).toMatchObject({
      from: '2026-10-05',
      to: '2026-10-07',
      isCurrent: true,
      isPartial: true,
    })
  })

  it('una semana que ya pasó deja de ser «actual» pero sigue siendo la misma semana', () => {
    const week = buildCurrentWeekPeriod(NOW)
    const nextMonday = new Date('2026-10-12T08:00:00-05:00')
    const fresh = refreshAnalysisPeriod(week, nextMonday)
    expect(fresh).toMatchObject({
      kind: 'week',
      from: '2026-10-05',
      to: '2026-10-11',
      calendarEnd: '2026-10-11',
      isCurrent: false,
      isPartial: false,
    })
  })

  it('mes y ciclo también se revalidan', () => {
    const month = analysisPeriodFromMonth(2026, 9, NOW)
    expect(
      refreshAnalysisPeriod(month, new Date('2026-11-02T08:00:00-05:00')),
    ).toMatchObject({ to: '2026-10-31', isCurrent: false, isPartial: false })
    const cycle = analysisPeriodFromCycle(2026, 2, NOW)
    expect(
      refreshAnalysisPeriod(cycle, new Date('2026-10-20T08:00:00-05:00')),
    ).toMatchObject({ to: '2026-10-20', isCurrent: true, isPartial: true })
  })
})

describe('analysis-period · drill-down del flujo (ciclo → mes → semana → día)', () => {
  it('default de producto: ciclo actual (H2 2026 al 6 oct)', () => {
    expect(buildCurrentCyclePeriod(NOW)).toMatchObject({
      kind: 'cycle',
      from: '2026-07-01',
      to: '2026-10-06',
      calendarEnd: '2026-12-31',
      isCurrent: true,
      isPartial: true,
      navigationContext: { year: 2026, half: 2 },
    })
  })

  it('ciclo → bucket de octubre → mes de octubre', () => {
    const cycle = buildCurrentCyclePeriod(NOW)
    const month = drillIntoPeriod(
      cycle,
      { calendarStart: '2026-10-01', calendarEnd: '2026-10-31' },
      NOW,
    )
    expect(month).toMatchObject({
      kind: 'month',
      from: '2026-10-01',
      calendarEnd: '2026-10-31',
      navigationContext: { year: 2026, month: 9 },
    })
  })

  it('mes → bucket «1–4 oct» → semana completa 28 sep – 4 oct, con contexto octubre', () => {
    const october = analysisPeriodFromMonth(2026, 9, NOW)
    const week = drillIntoPeriod(
      october,
      { calendarStart: '2026-09-28', calendarEnd: '2026-10-04' },
      NOW,
    )
    expect(week).toMatchObject({
      kind: 'week',
      from: '2026-09-28',
      to: '2026-10-04',
      calendarEnd: '2026-10-04',
      navigationContext: { year: 2026, month: 9 },
    })
  })

  it('la misma semana abierta desde septiembre conserva septiembre como contexto', () => {
    const september = analysisPeriodFromMonth(2026, 8, NOW)
    const week = drillIntoPeriod(
      september,
      { calendarStart: '2026-09-28', calendarEnd: '2026-10-04' },
      NOW,
    )
    expect(week?.navigationContext).toEqual({ year: 2026, month: 8 })
    expect(parentAnalysisPeriod(week!, NOW)).toMatchObject({ kind: 'month', from: '2026-09-01' })
  })

  it('semana → día: fin del drill-down (null); futuros tampoco son navegables', () => {
    const week = buildCurrentWeekPeriod(NOW)
    expect(
      drillIntoPeriod(week, { calendarStart: '2026-10-06', calendarEnd: '2026-10-06' }, NOW),
    ).toBeNull()
    const cycle = buildCurrentCyclePeriod(NOW)
    expect(
      drillIntoPeriod(
        cycle,
        { calendarStart: '2026-11-01', calendarEnd: '2026-11-30', future: true },
        NOW,
      ),
    ).toBeNull()
  })

  it('no fabrica periodos con metadatos incoherentes (no infiere desde labels)', () => {
    const october = analysisPeriodFromMonth(2026, 9, NOW)
    // calendarStart no es lunes → null, en vez de inventar una semana.
    expect(
      drillIntoPeriod(october, { calendarStart: '2026-10-01', calendarEnd: '2026-10-04' }, NOW),
    ).toBeNull()
    const cycle = buildCurrentCyclePeriod(NOW)
    expect(
      drillIntoPeriod(cycle, { calendarStart: '2026-10-05', calendarEnd: '2026-10-11' }, NOW),
    ).toBeNull()
  })

  it('subir: semana → mes → ciclo → null, y ruta completa', () => {
    const october = analysisPeriodFromMonth(2026, 9, NOW)
    const week = drillIntoPeriod(
      october,
      { calendarStart: '2026-10-05', calendarEnd: '2026-10-11' },
      NOW,
    )!
    const month = parentAnalysisPeriod(week, NOW)!
    expect(month).toMatchObject({ kind: 'month', from: '2026-10-01' })
    const cycle = parentAnalysisPeriod(month, NOW)!
    expect(cycle).toMatchObject({ kind: 'cycle', from: '2026-07-01' })
    expect(parentAnalysisPeriod(cycle, NOW)).toBeNull()
    expect(analysisPeriodTrail(week, NOW).map((p) => p.kind)).toEqual([
      'cycle',
      'month',
      'week',
    ])
  })

  it('ciclo contenedor de un mes/semana; revalidar no pierde el contexto de drill', () => {
    const march = analysisPeriodFromMonth(2025, 2, NOW)
    expect(containingCyclePeriod(march, NOW)).toMatchObject({
      kind: 'cycle',
      from: '2025-01-01',
    })
    const september = analysisPeriodFromMonth(2026, 8, NOW)
    const week = drillIntoPeriod(
      september,
      { calendarStart: '2026-09-28', calendarEnd: '2026-10-04' },
      NOW,
    )!
    const later = refreshAnalysisPeriod(
      { ...week, to: '2026-10-01', isPartial: true, isCurrent: true },
      NOW,
    )
    expect(later.navigationContext).toEqual({ year: 2026, month: 8 })
  })
})
