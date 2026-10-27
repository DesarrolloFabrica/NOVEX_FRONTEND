import { describe, expect, it } from 'vitest'
import {
  buildCyclePeriod,
  buildMonthPeriod,
  buildWeekPeriod,
  colombiaDayEndIso,
  colombiaDayStartIso,
  defaultHistoryPeriod,
  isValidHistoryPeriod,
  listWeekPeriodsInMonth,
  summaryCountLabel,
} from '@/modules/operational-cards/data/problemHistoryPeriod'

describe('problemHistoryPeriod · Colombia', () => {
  it('por defecto usa el mes calendario actual, no últimos 30 días', () => {
    // 29 sep 2026 18:00 UTC = mediodía Colombia aprox.
    const now = new Date('2026-09-29T17:00:00.000Z')
    const period = defaultHistoryPeriod(now)
    expect(period.kind).toBe('month')
    expect(period.key).toBe('2026-09')
    expect(period.from).toBe('2026-09-01')
    expect(period.to).toBe('2026-09-30')
    expect(period.label).toBe('Septiembre de 2026')
    expect(period.summaryPhrase).toBe('en septiembre de 2026')
  })

  it('ciclo 1 termina el 30 de junio e inicia ciclo 2 el 1 de julio', () => {
    const h1 = buildCyclePeriod(2026, 1)
    const h2 = buildCyclePeriod(2026, 2)
    expect(h1.to).toBe('2026-06-30')
    expect(h2.from).toBe('2026-07-01')

    const endH1 = new Date(colombiaDayEndIso(h1.to)).getTime()
    const startH2 = new Date(colombiaDayStartIso(h2.from)).getTime()
    expect(endH1).toBeLessThan(startH2)

    // Un cierre el 30 jun 23:59:59.999−05 queda dentro de closedTo de H1.
    const lastInstant = new Date('2026-07-01T04:59:59.999Z').getTime()
    expect(lastInstant).toBe(endH1)
    // El 1 jul 00:00:00−05 ya es H2.
    expect(new Date('2026-07-01T05:00:00.000Z').getTime()).toBe(startH2)
  })

  it('semana es lunes–domingo con etiqueta legible', () => {
    // 2026-09-16 es miércoles → lunes 14, domingo 20.
    const week = buildWeekPeriod('2026-09-14')
    expect(week.kind).toBe('week')
    expect(week.from).toBe('2026-09-14')
    expect(week.to).toBe('2026-09-20')
    expect(week.label).toMatch(/Semana del 14 al 20 de septiembre de 2026/)
  })

  it('lista pocas semanas por mes, no todo el año', () => {
    const weeks = listWeekPeriodsInMonth(2026, 8) // septiembre
    expect(weeks.length).toBeGreaterThan(0)
    expect(weeks.length).toBeLessThanOrEqual(6)
  })

  it('límites ISO usan offset de Colombia inclusivo', () => {
    expect(colombiaDayStartIso('2026-09-01')).toBe('2026-09-01T05:00:00.000Z')
    expect(colombiaDayEndIso('2026-09-01')).toBe('2026-09-02T04:59:59.999Z')
  })

  it('resumen usa el total real; sin total no inventa cifra', () => {
    const month = buildMonthPeriod(2026, 8)
    expect(summaryCountLabel(3, month)).toBe(
      '3 problemas cerrados en septiembre de 2026',
    )
    expect(summaryCountLabel(1, month)).toBe(
      '1 problema cerrado en septiembre de 2026',
    )
    expect(summaryCountLabel(null, month)).toBeNull()
  })

  it('valida el intervalo', () => {
    const ok = buildMonthPeriod(2026, 0)
    expect(isValidHistoryPeriod(ok)).toBe(true)
    expect(
      isValidHistoryPeriod({
        ...ok,
        from: '2026-02-01',
        to: '2026-01-01',
      }),
    ).toBe(false)
  })
})
