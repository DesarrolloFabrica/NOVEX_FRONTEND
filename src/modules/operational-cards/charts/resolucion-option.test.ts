import { describe, expect, it } from 'vitest'
import { NOVEX_AGING_TOKENS, NOVEX_RESOLUTION_TOKENS } from '@/modules/operational-cards/charts/novex-chart-theme'
import {
  RESOLUTION_BANDS,
  buildResolucionTrendOption,
  buildTiempoSolucionOption,
  formatResolutionAxisDays,
  formatResolutionDuration,
  resolucionLabeledIndexes,
  resolucionTooltipHtml,
  resolucionTooltipLines,
  resolutionBandColor,
  resolutionBandPercent,
  tiempoSolucionTooltipLines,
} from '@/modules/operational-cards/charts/resolucion-option'
import type {
  OperationalKpiFlowBucket,
  OperationalKpiResolution,
  OperationalKpiResolutionBucket,
} from '@/modules/operational-cards/types/operational-kpi.types'

/** H2 en curso: JUL–OCT con datos (AGO sin cierres), NOV–DIC futuros. */
const MONTHS = ['2026-07-01', '2026-08-01', '2026-09-01', '2026-10-01', '2026-11-01', '2026-12-01']

function flow(start: string, solved: number | null, current = false): OperationalKpiFlowBucket {
  const future = solved === null
  return {
    start,
    end: start,
    dataEnd: future ? null : start,
    calendarStart: start,
    calendarEnd: start,
    label: start,
    current,
    future,
    created: future ? null : 1,
    closed: solved,
    backlog: future ? null : 1,
    active: future
      ? null
      : { total: 1, internal: 1, external: 0, internalBreakdown: [], externalBreakdown: [] },
    solved: future ? null : { total: solved },
  }
}

const FLOW = [
  flow(MONTHS[0], 2),
  flow(MONTHS[1], 0),
  flow(MONTHS[2], 7),
  flow(MONTHS[3], 5, true),
  flow(MONTHS[4], null),
  flow(MONTHS[5], null),
]

const RESOLUTION: OperationalKpiResolution = {
  semantics: 'closed-in-period-duration-since-created',
  closedCount: 14,
  medianDays: 12.4,
  p75Days: 21,
  buckets: [
    { start: MONTHS[0], closedCount: 2, medianDays: 13.04, p75Days: 15.66 },
    { start: MONTHS[1], closedCount: 0, medianDays: null, p75Days: null },
    { start: MONTHS[2], closedCount: 7, medianDays: 20.78, p75Days: 23.56 },
    { start: MONTHS[3], closedCount: 5, medianDays: 4.18, p75Days: 18.12 },
    { start: MONTHS[4], closedCount: null, medianDays: null, p75Days: null },
    { start: MONTHS[5], closedCount: null, medianDays: null, p75Days: null },
  ],
  distribution: [
    { key: 'lt-1d', fromHours: 0, toHours: 24, count: 3 },
    { key: '1-3d', fromHours: 24, toHours: 72, count: 1 },
    { key: '3-7d', fromHours: 72, toHours: 168, count: 2 },
    { key: '7-14d', fromHours: 168, toHours: 336, count: 2 },
    { key: '14-30d', fromHours: 336, toHours: 720, count: 5 },
    { key: '30d+', fromHours: 720, toHours: null, count: 1 },
  ],
}

type LinePoint = null | {
  value: number
  symbolSize?: number
  itemStyle?: { color?: string; borderType?: string }
  label?: { show?: boolean; formatter?: () => string }
}
type LineSeries = {
  type: string
  smooth: boolean
  connectNulls: boolean
  data: LinePoint[]
  lineStyle: { color: string }
}

function lineSeries(option: Record<string, unknown>): LineSeries {
  const series = option.series as Array<{ type: string }>
  return series.find((s) => s.type === 'line') as unknown as LineSeries
}

describe('formatResolutionDuration (único formateador)', () => {
  it.each([
    [0.5 / 24, '< 1 h'],
    [1 / 24, '1 h'],
    [4 / 24, '4 h'],
    [6 / 24, '6 h'],
    [18 / 24, '18 h'],
    [23.9 / 24, '23 h'],
    [1, '1,0 d'],
    [1.44, '1,4 d'],
    [8.2, '8,2 d'],
    [9.96, '10 d'],
    [10, '10 d'],
    [31.4, '31 d'],
  ])('%f días → %s', (days, text) => {
    expect(formatResolutionDuration(days)).toBe(text)
  })

  it('versión larga en días para tooltips; horas se mantienen', () => {
    expect(formatResolutionDuration(20.78, { long: true })).toBe('21 días')
    expect(formatResolutionDuration(8.42, { long: true })).toBe('8,4 días')
    expect(formatResolutionDuration(4 / 24, { long: true })).toBe('4 h')
  })

  it('el eje es siempre días numéricos (sin «h» ni «d»)', () => {
    expect(formatResolutionAxisDays(7)).toBe('7')
    expect(formatResolutionAxisDays(0.5)).toBe('0,5')
  })
})

describe('TIEMPO DE RESOLUCIÓN · línea de la mediana', () => {
  const option = buildResolucionTrendOption(FLOW, RESOLUTION, 'month') as Record<string, unknown>
  const line = lineSeries(option)

  it('línea recta, sin conectar huecos; eje Y en días desde 0', () => {
    expect(line.smooth).toBe(false)
    expect(line.connectNulls).toBe(false)
    const yAxis = option.yAxis as { min: number; name: string; max: number }
    expect(yAxis.min).toBe(0)
    expect(yAxis.name).toBe('días')
    expect(yAxis.max).toBeGreaterThanOrEqual(20.78)
  })

  it('bucket sin cierres y futuros = null (corte de línea, nunca 0)', () => {
    expect(line.data.map((p) => (p === null ? null : p.value))).toEqual([
      13.04,
      null,
      20.78,
      4.18,
      null,
      null,
    ])
  })

  it('pocos cierres (n < 3): punto hueco y discontinuo, sin rojo', () => {
    const jul = line.data[0]!
    const sep = line.data[2]!
    expect(jul.itemStyle).toMatchObject({ color: NOVEX_RESOLUTION_TOKENS.paper, borderType: 'dashed' })
    expect(sep.itemStyle).toBeUndefined()
    expect(JSON.stringify(option)).not.toMatch(/#(c0392b|e74c3c|d32f2f|ff0000)/i)
  })

  it('rótulos solo en el último punto con dato y en el máximo', () => {
    expect([...resolucionLabeledIndexes(line.data.map((p) => p?.value ?? null))].sort()).toEqual([2, 3])
    expect(line.data[3]!.label?.show).toBe(true)
    expect(line.data[3]!.label?.formatter?.()).toBe('4,2 d')
    expect(line.data[2]!.label?.formatter?.()).toBe('21 d')
    expect(line.data[0]!.label?.show).toBe(false)
  })

  it('mismo eje temporal que Carga: categorías por bucket con ACTUAL y futuros atenuados', () => {
    const [axis] = option.xAxis as Array<{ data: string[] }>
    expect(axis.data).toHaveLength(6)
    expect(axis.data[3]).toContain('ACTUAL')
    expect(axis.data[4]).toContain('{future|')
  })
})

describe('Tooltip de la línea', () => {
  const at = (i: number): OperationalKpiResolutionBucket => RESOLUTION.buckets[i]

  it('mediana + solucionados; P75 redactado solo con n ≥ 4', () => {
    expect(resolucionTooltipLines('Septiembre 2026', at(2))).toEqual({
      title: 'SEPTIEMBRE 2026',
      rows: [
        ['Mediana', '21 días'],
        ['Solucionados', '7'],
        ['75 % en menos de', '24 días'],
      ],
      note: null,
    })
    const html = resolucionTooltipHtml('Septiembre 2026', at(2))
    expect(html).not.toMatch(/P75/)
  })

  it('n < 4 sin P75; n < 3 con nota discreta de pocos cierres', () => {
    const jul = resolucionTooltipLines('Julio 2026', at(0))
    expect(jul.rows.map(([label]) => label)).toEqual(['Mediana', 'Solucionados'])
    expect(jul.note).toBe('Pocos cierres en este periodo')
    const three = resolucionTooltipLines('x', { start: 'x', closedCount: 3, medianDays: 2, p75Days: 3 })
    expect(three.rows).toHaveLength(2)
    expect(three.note).toBeNull()
  })

  it('bucket sin cierres: lo dice, sin «0 días»', () => {
    const ago = resolucionTooltipLines('Agosto 2026', at(1))
    expect(ago.rows).toEqual([])
    expect(ago.note).toBe('Sin problemas solucionados en este periodo')
  })

  it('futuro sin tooltip', () => {
    const option = buildResolucionTrendOption(FLOW, RESOLUTION, 'month') as {
      tooltip: { formatter: (p: unknown) => string }
    }
    expect(option.tooltip.formatter({ dataIndex: 4 })).toBe('')
    expect(option.tooltip.formatter({ dataIndex: 2 })).toContain('SEPTIEMBRE 2026')
  })
})

describe('TIEMPO HASTA SOLUCIÓN · distribución', () => {
  const option = buildTiempoSolucionOption(RESOLUTION) as {
    yAxis: { data: string[] }
    series: Array<{ data: Array<{ value: number; itemStyle: { color: string } }> }>
  }

  it('los seis rangos en orden, con su conteo', () => {
    expect(option.yAxis.data).toEqual([
      '< 1 día',
      '1–3 días',
      '3–7 días',
      '7–14 días',
      '14–30 días',
      '30+ días',
    ])
    expect(option.series[0].data.map((d) => d.value)).toEqual([3, 1, 2, 2, 5, 1])
    expect(RESOLUTION_BANDS).toHaveLength(6)
  })

  it('escala tonal propia (crece con la duración), distinta de Antigüedad', () => {
    const colors = option.series[0].data.map((d) => d.itemStyle.color)
    expect(new Set(colors).size).toBe(6)
    expect(resolutionBandColor(0)).not.toBe(resolutionBandColor(5))
    expect(NOVEX_RESOLUTION_TOKENS.base).not.toBe(NOVEX_AGING_TOKENS.ink)
  })

  it('tooltip: título, problemas solucionados y % de los cierres (sin SLA)', () => {
    expect(tiempoSolucionTooltipLines(4, RESOLUTION)).toEqual([
      '14–30 DÍAS',
      '5 problemas solucionados',
      '36 % de los cierres',
    ])
    expect(tiempoSolucionTooltipLines(5, RESOLUTION)[1]).toBe('1 problema solucionado')
    expect(JSON.stringify(tiempoSolucionTooltipLines(2, RESOLUTION))).not.toMatch(/SLA/i)
  })

  it('porcentajes enteros sobre los cierres del periodo', () => {
    expect(resolutionBandPercent(7, 20)).toBe(35)
    expect(resolutionBandPercent(0, 0)).toBe(0)
  })
})
