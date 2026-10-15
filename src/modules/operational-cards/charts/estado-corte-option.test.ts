import { describe, expect, it } from 'vitest'
import {
  attentionRows,
  buildSeverityRowsOption,
  SEVERITY_ROWS,
  severityRowsDescription,
  severityRowsScale,
  wholePercents,
} from '@/modules/operational-cards/charts/estado-corte-option'
import { NOVEX_SEVERITY_COLORS } from '@/modules/operational-cards/charts/DirectorEstadoCompositionCharts'

type Bar = {
  data: Array<{ value: number; itemStyle: { color: string; borderWidth: number }; label?: { color?: string } }>
  label: { formatter: (p: { value?: number }) => string }
}

function option(severity = { critical: 1, high: 4, medium: 0, low: 7 }) {
  return buildSeverityRowsOption(severity) as unknown as {
    yAxis: { data: string[]; inverse: boolean }
    xAxis: { min: number; max: number; interval: number }
    series: Bar[]
    tooltip: { formatter: (p: unknown) => string }
  }
}

describe('Severidad en filas horizontales', () => {
  it('orden fijo Crítica → Alta → Media → Baja, con Crítica arriba', () => {
    expect(SEVERITY_ROWS.map((r) => r.label)).toEqual(['Crítica', 'Alta', 'Media', 'Baja'])
    const o = option()
    expect(o.yAxis.data).toEqual(['Crítica', 'Alta', 'Media', 'Baja'])
    expect(o.yAxis.inverse).toBe(true)
  })

  it('conserva el color de cada severidad y las cuatro filas aunque haya ceros', () => {
    const bars = option().series[0].data
    expect(bars.map((b) => b.value)).toEqual([1, 4, 0, 7])
    expect(bars.map((b) => b.itemStyle.color)).toEqual([
      NOVEX_SEVERITY_COLORS.critical,
      NOVEX_SEVERITY_COLORS.high,
      NOVEX_SEVERITY_COLORS.medium,
      NOVEX_SEVERITY_COLORS.low,
    ])
  })

  it('un 0 real lleva su «0» atenuado (visible sin tooltip)', () => {
    const o = option()
    expect(o.series[0].data[2].label?.color).toMatch(/0\.5\)/)
    expect(o.series[0].label.formatter({ value: 0 })).toBe('0')
  })

  it('escala común con origen 0 y divisiones enteras (≤ 4)', () => {
    const o = option()
    expect(o.xAxis.min).toBe(0)
    expect(o.xAxis.max % o.xAxis.interval).toBe(0)
    expect(Number.isInteger(o.xAxis.interval)).toBe(true)
    for (const peak of [0, 1, 2, 3, 7, 13, 26, 99]) {
      const s = severityRowsScale(peak)
      expect(s.max).toBeGreaterThanOrEqual(Math.max(1, peak))
      expect(s.max / s.interval).toBeLessThanOrEqual(4)
      expect(Number.isInteger(s.interval)).toBe(true)
    }
  })

  it('tooltip y descripción accesible con cantidades y total', () => {
    const o = option()
    expect(o.tooltip.formatter({ dataIndex: 1, value: 4 })).toContain('4 de 12 activos · 33 %')
    expect(severityRowsDescription({ critical: 1, high: 4, medium: 0, low: 7 })).toBe(
      'Severidad de los 12 activos: crítica 1, alta 4, media 0, baja 7.',
    )
  })
})

describe('Leyenda de Atención', () => {
  it('porcentajes enteros que suman 100 (mayor resto); total 0 → todos 0', () => {
    expect(wholePercents([1, 1, 1])).toEqual([34, 33, 33])
    expect(wholePercents([8, 7, 6, 0])).toEqual([38, 33, 29, 0])
    expect(wholePercents([0, 0])).toEqual([0, 0])
    expect(wholePercents([2, 0, 0, 0])).toEqual([100, 0, 0, 0])
  })

  it('corte histórico: incluye «Cerrados después del corte» aunque sea 0', () => {
    const rows = attentionRows({ open: 3, inProgress: 1, closedAfterCut: 0, unclassified: 0 }, { historical: true })
    expect(rows.map((r) => [r.label, r.count, r.pct])).toEqual([
      ['Abiertos', 3, 75],
      ['En atención', 1, 25],
      ['Cerrados después del corte', 0, 0],
    ])
  })

  it('corte de hoy: sin «Cerrados después»; «Sin clasificar» solo si existe, sobre el total completo', () => {
    expect(
      attentionRows({ open: 3, inProgress: 1, closedAfterCut: 0, unclassified: 0 }, { historical: false }).map(
        (r) => r.key,
      ),
    ).toEqual(['open', 'progress'])
    const rows = attentionRows({ open: 2, inProgress: 1, closedAfterCut: 0, unclassified: 1 }, { historical: false })
    expect(rows.map((r) => [r.key, r.pct])).toEqual([
      ['open', 50],
      ['progress', 25],
      ['unclassified', 25],
    ])
  })
})
