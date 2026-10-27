import { describe, expect, it } from 'vitest'
import {
  buildNuevosCerradosOption,
  buildPendientesOption,
} from '@/modules/operational-cards/charts/DirectorEstadoCharts'
import {
  inkAlpha,
  mergeNovexChartOption,
  buildNovexChartBaseOption,
} from '@/modules/operational-cards/charts/novex-chart-theme'
import type { OperationalKpiHistoryPoint } from '@/modules/operational-cards/types/operational-kpi.types'

const SERIES: OperationalKpiHistoryPoint[] = [
  {
    start: '2026-09-07',
    end: '2026-09-13',
    label: '7–13 septiembre',
    value: 0,
  },
  {
    start: '2026-09-14',
    end: '2026-09-20',
    label: '14–20 septiembre',
    value: 5,
  },
  {
    start: '2026-10-05',
    end: '2026-10-11',
    label: '5–11 octubre',
    value: 6,
  },
]

describe('Novex chart theme + ESTADO options', () => {
  it('inkAlpha produce rgba usable para area fill', () => {
    expect(inkAlpha('#2a2118', 0.3)).toBe('rgba(42, 33, 24, 0.3)')
  })

  it('merge conserva grid containLabel del tema', () => {
    const merged = mergeNovexChartOption(buildNovexChartBaseOption(), {
      grid: { top: 40 },
      series: [],
    })
    expect((merged.grid as { containLabel?: boolean }).containLabel).toBe(true)
    expect((merged.grid as { top?: number }).top).toBe(40)
  })

  it('pendientes usa step + areaStyle y callout del último punto', () => {
    const option = buildPendientesOption(SERIES)
    const series = (option.series as Array<Record<string, unknown>>)[0]
    expect(series.step).toBe('end')
    expect(series.areaStyle).toBeTruthy()
    expect((series.lineStyle as { width: number }).width).toBeGreaterThanOrEqual(3)
    const marks = (series.markPoint as { data: unknown[] }).data
    expect(marks.length).toBeGreaterThanOrEqual(1)
  })

  it('nuevos vs cerrados usa barras redondeadas agrupadas', () => {
    const option = buildNuevosCerradosOption(SERIES, SERIES)
    const series = option.series as Array<Record<string, unknown>>
    expect(series).toHaveLength(2)
    expect(
      (series[0].itemStyle as { borderRadius: number[] }).borderRadius[0],
    ).toBeGreaterThanOrEqual(5)
    expect(series[0].type).toBe('bar')
    expect(series[1].type).toBe('bar')
  })

  it('serie vacía no rompe opciones', () => {
    const empty = buildPendientesOption([])
    expect((empty.series as unknown[]).length).toBe(1)
  })
})
