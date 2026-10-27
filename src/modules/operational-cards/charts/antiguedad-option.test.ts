import { describe, expect, it } from 'vitest'
import { agingFixture } from '@/modules/operational-cards/charts/antiguedad.fixture'
import {
  AGING_BANDS,
  agingBandColor,
  agingBandIndex,
  agingBandPercent,
  buildDistribucionOption,
  distribucionAxis,
  distribucionTooltipHtml,
  distribucionTooltipLines,
  formatAgingMedian,
  agingKindLine,
  agingRemainderText,
  agingTooltipHtml,
  agingTooltipLines,
  buildAntiguedadOption,
  formatAgeLabel,
  formatAgingCut,
} from '@/modules/operational-cards/charts/antiguedad-option'
import { NOVEX_SEVERITY_COLORS } from '@/modules/operational-cards/charts/DirectorEstadoCompositionCharts'
import type { OperationalKpiAgingItem } from '@/modules/operational-cards/types/operational-kpi.types'

type BarDatum = { value: number; itemStyle: { color: string } }
type LabelFormatter = (params: { value?: number }) => string

function series(option: ReturnType<typeof buildAntiguedadOption>) {
  const list = option.series as Array<{
    type: string
    data: BarDatum[]
    label: { position: string; formatter: LabelFormatter }
  }>
  return list[0]
}

const NOW = agingFixture({ at: '2026-10-07', isNow: true })
const PAST = agingFixture({
  at: '2026-09-30',
  isNow: false,
  closedAfterCut: { 0: '2026-11-12T15:00:00.000Z' },
})

describe('buildAntiguedadOption', () => {
  it('top 5, barras HORIZONTALES: eje Y = problemas (más antiguo arriba), eje X = días', () => {
    const option = buildAntiguedadOption(NOW)
    const yAxis = option.yAxis as { type: string; inverse: boolean; data: string[] }
    const xAxis = option.xAxis as { type: string }
    expect(yAxis.type).toBe('category')
    expect(yAxis.inverse).toBe(true)
    expect(xAxis.type).toBe('value')
    expect(series(option).type).toBe('bar')
    expect(yAxis.data).toHaveLength(5)
    expect(yAxis.data[0]).toBe('Falla en matrícula de nuevos ingresos')
    expect(series(option).data.map((d) => d.value)).toEqual([63, 43, 31, 18, 9])
  })

  it('valor visible al final de la barra: «43 d», «1 d», «HOY»', () => {
    const label = series(buildAntiguedadOption(NOW)).label
    expect(label.position).toBe('right')
    expect(label.formatter({ value: 43 })).toBe('43 d')
    expect(formatAgeLabel(1)).toBe('1 d')
    expect(formatAgeLabel(0)).toBe('HOY')
    expect(label.formatter({ value: 0 })).toBe('HOY')
  })

  it('la severidad NO controla el color: misma edad → mismo color, nunca la paleta de severidad', () => {
    const base = NOW.oldest[0]
    const twin = (severity: OperationalKpiAgingItem['severity']) => ({
      ...base,
      id: severity,
      severity,
      ageDays: 20,
    })
    const option = buildAntiguedadOption({
      ...NOW,
      oldest: [twin('CRITICAL'), twin('LOW'), twin('HIGH')],
    })
    const colors = series(option).data.map((d) => d.itemStyle.color)
    expect(new Set(colors).size).toBe(1)
    const severityPalette = Object.values(NOVEX_SEVERITY_COLORS).map((c) => c.toLowerCase())
    for (const color of series(buildAntiguedadOption(NOW)).data.map((d) => d.itemStyle.color)) {
      expect(severityPalette).not.toContain(color.toLowerCase())
    }
  })

  it('tono = RANGO de edad (misma escala que la distribución), no posición relativa', () => {
    const colors = series(buildAntiguedadOption(NOW)).data.map((d) => d.itemStyle.color)
    // 63 y 43 → 31+; 31 → 31+; 18 → 15–30; 9 → 8–14.
    expect(colors).toEqual([
      agingBandColor(3),
      agingBandColor(3),
      agingBandColor(3),
      agingBandColor(2),
      agingBandColor(1),
    ])
  })
})

describe('tooltip de ANTIGÜEDAD', () => {
  it('corte HOY: edad, fecha, severidad · estado · SLA vencido, tipo', () => {
    const critical = NOW.oldest[1] // 43 d, CRITICAL, INTER Saber Pro
    expect(agingTooltipLines(critical, NOW)).toEqual([
      'Entrega de actas pendiente para Saber Pro',
      '43 días · desde 25 ago 2026',
      'CRÍTICA · En atención · SLA vencido',
      'Compromiso · afecta a Saber Pro',
    ])
  })

  it('corte histórico: «(actual)», «Solucionado después», sin estado ni SLA', () => {
    const lines = agingTooltipLines(PAST.oldest[0], PAST)
    expect(lines).toEqual([
      'Falla en matrícula de nuevos ingresos',
      '63 días · desde 29 jul 2026',
      'BAJA (actual)',
      'Solucionado después · 12 nov',
      'Interno · Admisiones',
    ])
    const joined = agingTooltipLines(PAST.oldest[1], PAST).join(' | ')
    expect(joined).not.toMatch(/SLA/)
    expect(joined).not.toMatch(/Abierto|En atención/)
    // Sigue activo hoy: no hay «solucionado después».
    expect(joined).not.toMatch(/Solucionado después/)
  })

  it('aunque el ítem traiga SLA, un corte histórico no lo afirma', () => {
    const leaky = { ...PAST.oldest[1], slaOverdue: true, status: 'OPEN' as const }
    expect(agingTooltipLines(leaky, PAST).join(' ')).not.toMatch(/SLA|Abierto/)
  })

  it('registrado hoy y 1 día en prosa', () => {
    const today = { ...NOW.oldest[0], ageDays: 0 }
    expect(agingTooltipLines(today, NOW)[1]).toMatch(/^Registrado hoy · desde /)
    expect(agingTooltipLines({ ...today, ageDays: 1 }, NOW)[1]).toMatch(/^1 día · /)
  })

  it('INTERNAL sin categoría e INTER con afectada; nunca «Reportado por»', () => {
    const internal = { ...NOW.oldest[0], categoryName: null }
    expect(agingKindLine(internal)).toBe('Interno · Sin categoría')
    expect(agingKindLine(NOW.oldest[4])).toBe('Compromiso · afecta a Servicios')
    // La responsable es la carta seleccionada: no se repite en el tooltip.
    expect(agingTooltipHtml(NOW.oldest[4], NOW)).not.toMatch(/Responsable/)
    expect(agingTooltipHtml(NOW.oldest[4], NOW)).not.toMatch(/Reportado por/)
  })

  it('escapa el título (texto de usuario) en el HTML', () => {
    const html = agingTooltipHtml({ ...NOW.oldest[0], title: '<img src=x onerror=alert(1)>' }, NOW)
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;img')
  })
})

describe('textos de la lámina', () => {
  it('corte: HOY o AL CIERRE DEL <fecha>', () => {
    expect(formatAgingCut(NOW)).toBe('HOY')
    expect(formatAgingCut(PAST)).toBe('AL CIERRE DEL 30 SEP 2026')
  })

  it('«+ N activos fuera del Top 5» solo si activeCount > 5 (nunca «adicionales»)', () => {
    expect(agingRemainderText(NOW)).toBe('+ 2 activos fuera del Top 5')
    expect(agingRemainderText(agingFixture({ at: '2026-10-07', isNow: true, activeCount: 6 }))).toBe(
      '+ 1 activo fuera del Top 5',
    )
    expect(agingRemainderText(agingFixture({ at: '2026-10-07', isNow: true, activeCount: 5 }))).toBeNull()
  })
})

describe('ANTIGÜEDAD DE LA CARGA · distribución', () => {
  type DistDatum = { value: number; itemStyle: { color: string } }
  const distSeries = (aging: Parameters<typeof buildDistribucionOption>[0]) =>
    (buildDistribucionOption(aging).series as Array<{
      type: string
      data: DistDatum[]
      label: { position: string; formatter: (p: { value?: number }) => string }
    }>)[0]

  it('rangos de Fase 1: 0–7 · 8–14 · 15–30 · 31+, con los mismos límites que el SQL', () => {
    expect(AGING_BANDS.map((band) => band.key)).toEqual(['0-7', '8-14', '15-30', '31+'])
    expect([0, 7, 8, 14, 15, 30, 31, 400].map(agingBandIndex)).toEqual([
      0, 0, 1, 1, 2, 2, 3, 3,
    ])
  })

  it('barras HORIZONTALES con las cuatro bandas en orden y su count al final', () => {
    const option = buildDistribucionOption(NOW)
    const yAxis = option.yAxis as { type: string; inverse: boolean; data: string[] }
    expect(yAxis.type).toBe('category')
    expect(yAxis.inverse).toBe(true)
    expect((option.xAxis as { type: string }).type).toBe('value')
    expect(yAxis.data).toEqual(['0–7 días', '8–14 días', '15–30 días', '31+ días'])
    const s = distSeries(NOW)
    expect(s.type).toBe('bar')
    // QA: 63, 43, 31 → 31+ (3) · 18 → 15–30 (1) · 9 → 8–14 (1) · 3, 0 → 0–7 (2)
    expect(s.data.map((d) => d.value)).toEqual([2, 1, 1, 3])
    expect(s.label.position).toBe('right')
    expect(s.label.formatter({ value: 3 })).toBe('3')
  })

  it('la suma de las barras es la carga activa', () => {
    const total = distSeries(NOW).data.reduce((sum, d) => sum + d.value, 0)
    expect(total).toBe(NOW.activeCount)
  })

  it('paleta de envejecimiento: tinta de clara a profunda, nunca la de severidad', () => {
    const colors = distSeries(NOW).data.map((d) => d.itemStyle.color)
    expect(colors).toEqual([0, 1, 2, 3].map(agingBandColor))
    expect(new Set(colors).size).toBe(4)
    const alpha = (c: string) => Number(/,\s*([\d.]+)\)$/.exec(c)?.[1])
    expect(colors.map(alpha)).toEqual([...colors.map(alpha)].sort((a, b) => a - b))
    const severityPalette = Object.values(NOVEX_SEVERITY_COLORS).map((c) => c.toLowerCase())
    for (const color of colors) expect(severityPalette).not.toContain(color.toLowerCase())
  })

  it('tooltip corto: rango, problemas, % de la carga y corte (sin listar problemas)', () => {
    expect(distribucionTooltipLines(2, PAST)).toEqual([
      '15–30 DÍAS',
      '1 problema activo',
      '14 % de la carga',
      'Corte: 30 sep 2026',
    ])
    expect(distribucionTooltipLines(3, NOW)).toEqual([
      '31+ DÍAS',
      '3 problemas activos',
      '43 % de la carga',
      'Corte: hoy · 7 oct 2026',
    ])
    const html = distribucionTooltipHtml(3, NOW)
    expect(html).not.toContain(NOW.oldest[0].title)
  })

  it('eje discreto: intervalo redondo, máximo múltiplo exacto (sin «9 10»)', () => {
    expect(distribucionAxis(7)).toEqual({ max: 10, interval: 5 })
    expect(distribucionAxis(12)).toEqual({ max: 15, interval: 5 })
    expect(distribucionAxis(3)).toEqual({ max: 4, interval: 1 })
    for (const n of [0, 1, 4, 9, 25, 60, 130]) {
      const { max, interval } = distribucionAxis(n)
      expect(max % interval).toBe(0)
      expect(max).toBeGreaterThan(n)
      expect(max / interval).toBeLessThanOrEqual(4)
    }
  })

  it('porcentaje sobre la carga activa (0 sin carga)', () => {
    expect(agingBandPercent(4, 22)).toBe(18)
    expect(agingBandPercent(0, 0)).toBe(0)
  })

  it('mediana secundaria: «Mediana · 11 días», decimales con coma, null sin activos', () => {
    expect(formatAgingMedian(11)).toBe('Mediana · 11 días')
    expect(formatAgingMedian(1)).toBe('Mediana · 1 día')
    expect(formatAgingMedian(12.5)).toBe('Mediana · 12,5 días')
    expect(formatAgingMedian(null)).toBeNull()
  })
})
