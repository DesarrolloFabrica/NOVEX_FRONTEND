import type { EChartsCoreOption } from 'echarts/core'
import type { OperationalKpiHistoryPoint } from '@/modules/operational-cards/types/operational-kpi.types'
import { NovexEChart } from '@/modules/operational-cards/charts/NovexChart'
import {
  DEFAULT_NOVEX_CHART_TOKENS,
  NOVEX_SAFE_GRID,
  novexAccentColor,
  novexAreaGradient,
  resolveAccent,
} from '@/modules/operational-cards/charts/novex-chart-theme'

/** Altura reservada dentro del frame de evolución. */
export const ESTADO_CHART_HEIGHT = 248

const MONTH_SHORT = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
] as const

function shortAxis(point: OperationalKpiHistoryPoint): string {
  const month = MONTH_SHORT[Number(point.start.slice(5, 7)) - 1] ?? ''
  const day = Number(point.start.slice(8, 10))
  return `${day} ${month}`
}

function monthAxis(point: OperationalKpiHistoryPoint): string {
  return MONTH_SHORT[Number(point.start.slice(5, 7)) - 1] ?? ''
}

function shouldLabel(index: number, total: number): boolean {
  if (total <= 5) return true
  if (index === 0 || index === total - 1) return true
  const mid = Math.floor(total / 2)
  const q1 = Math.floor(total / 4)
  const q3 = Math.floor((total * 3) / 4)
  return index === mid || index === q1 || index === q3
}

function findMaxIndex(values: readonly number[]): number {
  let max = -Infinity
  let idx = -1
  for (let i = 0; i < values.length; i += 1) {
    if (values[i] > max) {
      max = values[i]
      idx = i
    }
  }
  return idx
}

export function buildPendientesOption(
  series: readonly OperationalKpiHistoryPoint[],
): EChartsCoreOption {
  const accent = novexAccentColor()
  const categories = series.map((point) => monthAxis(point))
  const values = series.map((point) => point.value)
  const last = values.length - 1
  const maxIdx = findMaxIndex(values)
  const max = Math.max(0, ...values)
  const yMax = Math.max(2, Math.ceil(max * 1.18))
  const lineWidth = DEFAULT_NOVEX_CHART_TOKENS.lineWidth

  const markData: Array<{
    coord: [number, number]
    value: number
    symbolSize?: number
    label?: { show?: boolean; formatter?: string; position?: string }
  }> = []

  if (last >= 0) {
    markData.push({
      coord: [last, values[last]],
      value: values[last],
      symbolSize: 13,
      label: {
        show: true,
        formatter: '{c}',
        position: 'top',
      },
    })
  }
  if (maxIdx >= 0 && maxIdx !== last && values[maxIdx] > 0) {
    markData.push({
      coord: [maxIdx, values[maxIdx]],
      value: values[maxIdx],
      symbolSize: 8,
      label: {
        show: true,
        formatter: '{c}',
        position: 'top',
      },
    })
  }

  return {
    grid: { ...NOVEX_SAFE_GRID, top: 36, right: 22 },
    xAxis: {
      type: 'category',
      data: categories,
      boundaryGap: false,
      axisLabel: {
        formatter: (_value: string, index: number) =>
          shouldLabel(index, series.length) ? categories[index] : '',
      },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: yMax,
      minInterval: 1,
      splitNumber: 4,
    },
    series: [
      {
        type: 'line',
        name: 'Pendientes de cierre',
        data: values,
        step: 'end',
        smooth: false,
        showSymbol: false,
        symbol: 'circle',
        lineStyle: {
          width: lineWidth,
          color: accent,
          cap: 'round',
          join: 'round',
        },
        itemStyle: { color: accent },
        areaStyle: {
          color: novexAreaGradient(accent),
          origin: 'start',
        },
        emphasis: {
          scale: false,
          focus: 'series',
          lineStyle: { width: lineWidth + 0.4 },
        },
        markPoint: {
          symbol: 'circle',
          symbolSize: 12,
          data: markData,
          itemStyle: {
            color: accent,
            borderColor: '#f6f0e6',
            borderWidth: 2.5,
            shadowBlur: 0,
          },
          label: {
            color: '#231910',
            fontWeight: 800,
            fontSize: 12,
            fontFamily: DEFAULT_NOVEX_CHART_TOKENS.fontFamily,
            distance: 8,
            backgroundColor: 'rgb(246 240 230 / 0.92)',
            padding: [2, 5],
            borderColor: 'rgb(35 25 16 / 0.25)',
            borderWidth: 1,
          },
        },
        z: 3,
      },
    ],
    tooltip: {
      trigger: 'axis',
      formatter: (params: unknown) => {
        const list = Array.isArray(params) ? params : [params]
        const first = list[0] as { dataIndex?: number }
        const index = first.dataIndex ?? 0
        const point = series[index]
        if (!point) return ''
        return `<div style="font-weight:800;margin-bottom:2px">${point.label}</div>Pendientes de cierre: <b>${point.value}</b>`
      },
    },
  }
}

export function buildNuevosCerradosOption(
  created: readonly OperationalKpiHistoryPoint[],
  closed: readonly OperationalKpiHistoryPoint[],
): EChartsCoreOption {
  const accent = resolveAccent()
  const categories = created.map((point, index) =>
    shouldLabel(index, created.length) ? shortAxis(point) : '',
  )
  const createdValues = created.map((point) => point.value)
  const closedValues = closed.map((point) => point.value)
  const showLabel = created.length <= 8
  const radius = DEFAULT_NOVEX_CHART_TOKENS.barRadius
  const max = Math.max(0, ...createdValues, ...closedValues)
  const yMax = Math.max(2, Math.ceil(max * 1.22))

  return {
    legend: {
      data: ['Nuevos', 'Cerrados'],
      top: 0,
      left: 0,
      itemWidth: 12,
      itemHeight: 10,
      itemGap: 14,
      textStyle: {
        fontFamily: DEFAULT_NOVEX_CHART_TOKENS.fontFamily,
        fontSize: 11,
        fontWeight: 700,
        color: '#231910',
      },
    },
    grid: { ...NOVEX_SAFE_GRID, top: 36 },
    xAxis: {
      type: 'category',
      data: categories,
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: yMax,
      minInterval: 1,
      splitNumber: 4,
    },
    series: [
      {
        type: 'bar',
        name: 'Nuevos',
        data: createdValues,
        barMaxWidth: 18,
        barGap: '28%',
        itemStyle: {
          color: accent,
          borderColor: '#231910',
          borderWidth: 1.2,
          borderRadius: [radius, radius, 2, 2],
        },
        label: {
          show: showLabel,
          position: 'top',
          distance: 4,
          fontSize: 10,
          fontWeight: 800,
          color: '#231910',
          fontFamily: DEFAULT_NOVEX_CHART_TOKENS.fontFamily,
          formatter: (params: { value?: number }) =>
            params.value && params.value > 0 ? String(params.value) : '',
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 0,
            borderWidth: 1.6,
          },
        },
      },
      {
        type: 'bar',
        name: 'Cerrados',
        data: closedValues,
        barMaxWidth: 18,
        itemStyle: {
          color: 'rgb(35 25 16 / 0.16)',
          borderColor: '#231910',
          borderWidth: 1.3,
          borderRadius: [radius, radius, 2, 2],
          decal: {
            symbol: 'line',
            rotation: -Math.PI / 4,
            dashArrayX: [1, 0],
            dashArrayY: [2, 3],
            color: 'rgb(35 25 16 / 0.4)',
          },
        },
        label: {
          show: showLabel,
          position: 'top',
          distance: 4,
          fontSize: 10,
          fontWeight: 800,
          color: '#231910',
          fontFamily: DEFAULT_NOVEX_CHART_TOKENS.fontFamily,
          formatter: (params: { value?: number }) =>
            params.value && params.value > 0 ? String(params.value) : '',
        },
      },
    ],
    tooltip: {
      trigger: 'axis',
      formatter: (params: unknown) => {
        const list = Array.isArray(params) ? params : [params]
        const index =
          (list[0] as { dataIndex?: number } | undefined)?.dataIndex ?? 0
        const label = created[index]?.label ?? closed[index]?.label ?? ''
        const createdValue = created[index]?.value ?? 0
        const closedValue = closed[index]?.value ?? 0
        return `<div style="font-weight:800;margin-bottom:2px">${label}</div>Nuevos: <b>${createdValue}</b><br/>Cerrados: <b>${closedValue}</b>`
      },
    },
  }
}

export function PendientesChart({
  series,
}: {
  series: readonly OperationalKpiHistoryPoint[]
}) {
  const first = series[0]?.value ?? 0
  const last = series[series.length - 1]?.value ?? 0
  const aria = `El número de problemas pendientes pasó de ${first} a ${last} durante las últimas ${series.length} semanas.`

  return (
    <NovexEChart
      option={buildPendientesOption(series)}
      ariaLabel={aria}
      testId="director-history-chart-pendientes"
      height={ESTADO_CHART_HEIGHT}
    />
  )
}

export function NuevosCerradosChart({
  created,
  closed,
}: {
  created: readonly OperationalKpiHistoryPoint[]
  closed: readonly OperationalKpiHistoryPoint[]
}) {
  const createdTotal = created.reduce((sum, point) => sum + point.value, 0)
  const closedTotal = closed.reduce((sum, point) => sum + point.value, 0)
  const aria = `En el periodo se presentaron ${createdTotal} problemas nuevos y se cerraron ${closedTotal}.`

  return (
    <NovexEChart
      option={buildNuevosCerradosOption(created, closed)}
      ariaLabel={aria}
      testId="director-history-chart-flujo"
      height={ESTADO_CHART_HEIGHT}
    />
  )
}
