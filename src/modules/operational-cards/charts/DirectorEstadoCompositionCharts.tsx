import type { EChartsCoreOption } from 'echarts/core'
import type {
  OperationalKpiSeverityCounts,
  OperationalKpiStatusCounts,
} from '@/modules/operational-cards/types/operational-kpi.types'
import { NovexEChart } from '@/modules/operational-cards/charts/NovexChart'
import {
  DEFAULT_NOVEX_CHART_TOKENS,
} from '@/modules/operational-cards/charts/novex-chart-theme'

/** Colores semánticos de severidad (no identidad de coordinación). */
export const NOVEX_SEVERITY_COLORS = {
  low: '#5c6b4a',
  medium: '#c07818',
  high: '#a04822',
  critical: '#9a2a26',
} as const

/** Colores de estado de atención (dimensión distinta a severidad). */
export const NOVEX_ATTENTION_COLORS = {
  open: '#6b5a3e',
  inProgress: '#3d5a6b',
  /** Ya no activo hoy: neutro, no compite con los dos estados vivos. */
  closedAfterCut: '#cfc2a8',
  unclassified: '#e2d9c6',
} as const

const SEVERITY_ORDER: ReadonlyArray<{
  key: keyof OperationalKpiSeverityCounts
  label: string
  tooltipName: string
}> = [
  { key: 'low', label: 'Baja', tooltipName: 'Severidad baja' },
  { key: 'medium', label: 'Media', tooltipName: 'Severidad media' },
  { key: 'high', label: 'Alta', tooltipName: 'Severidad alta' },
  { key: 'critical', label: 'Crítica', tooltipName: 'Severidad crítica' },
]

const COMPOSITION_CHART_HEIGHT = 156

export function buildSeverityBarsOption(
  severity: OperationalKpiSeverityCounts,
): EChartsCoreOption {
  const categories = SEVERITY_ORDER.map((item) => item.label)
  const values = SEVERITY_ORDER.map((item) => severity[item.key])
  const colors = SEVERITY_ORDER.map(
    (item) => NOVEX_SEVERITY_COLORS[item.key],
  )
  const max = Math.max(0, ...values)
  const yMax = Math.max(2, Math.ceil(max * 1.15))

  return {
    animationDuration: 320,
    animationEasing: 'cubicOut',
    grid: {
      left: 6,
      right: 6,
      top: 26,
      bottom: 8,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: categories,
      axisTick: { show: false },
      axisLine: {
        lineStyle: { color: '#231910', width: 1.5 },
      },
      axisLabel: {
        color: 'rgb(35 25 16 / 0.62)',
        fontSize: 10,
        fontWeight: 800,
        fontFamily: DEFAULT_NOVEX_CHART_TOKENS.fontFamily,
        interval: 0,
        margin: 8,
      },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: yMax,
      minInterval: 1,
      splitNumber: 4,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: 'rgb(35 25 16 / 0.45)',
        fontSize: 9,
        fontWeight: 700,
        formatter: (value: number) => String(Math.round(value)),
      },
      splitLine: {
        lineStyle: {
          color: 'rgb(35 25 16 / 0.09)',
          width: 1,
          type: 'dashed',
        },
      },
    },
    series: [
      {
        type: 'bar',
        name: 'Severidad',
        data: values.map((value, index) => ({
          value,
          itemStyle: {
            color: colors[index],
            borderColor: '#231910',
            borderWidth: 1.2,
            borderRadius: [6, 6, 2, 2],
          },
        })),
        barMaxWidth: 28,
        barCategoryGap: '42%',
        label: {
          show: true,
          position: 'top',
          distance: 4,
          formatter: (params: { value?: number }) =>
            String(params.value ?? 0),
          color: '#231910',
          fontSize: 11,
          fontWeight: 800,
          fontFamily: DEFAULT_NOVEX_CHART_TOKENS.fontFamily,
        },
        emphasis: {
          itemStyle: {
            borderWidth: 1.6,
            shadowBlur: 0,
          },
        },
      },
    ],
    tooltip: {
      trigger: 'item',
      formatter: (params: unknown) => {
        const item = params as { dataIndex?: number; value?: number }
        const index = item.dataIndex ?? 0
        const meta = SEVERITY_ORDER[index]
        const value = item.value ?? 0
        const noun = value === 1 ? 'problema activo' : 'problemas activos'
        return `<div style="font-weight:800;margin-bottom:2px">${meta.tooltipName}</div>${value} ${noun}`
      },
    },
  }
}

/**
 * Atención de una población. En un corte histórico pueden existir problemas
 * activos entonces que hoy ya están cerrados (`closedAfterCut`): se muestran
 * como su propio segmento, nunca se les inventa un status de aquella fecha.
 */
export type AttentionComposition = OperationalKpiStatusCounts & {
  closedAfterCut?: number
  unclassified?: number
}

export function attentionTotal(status: AttentionComposition): number {
  return (
    status.open +
    status.inProgress +
    (status.closedAfterCut ?? 0) +
    (status.unclassified ?? 0)
  )
}

export function buildAttentionDonutOption(
  status: AttentionComposition,
): EChartsCoreOption {
  const total = attentionTotal(status)
  const extra = [
    {
      name: 'Solucionados después del corte',
      value: status.closedAfterCut ?? 0,
      color: NOVEX_ATTENTION_COLORS.closedAfterCut,
    },
    {
      name: 'Sin clasificar',
      value: status.unclassified ?? 0,
      color: NOVEX_ATTENTION_COLORS.unclassified,
    },
  ].filter((item) => item.value > 0)

  const data =
    total === 0
      ? [
          {
            name: 'Sin activos',
            value: 1,
            itemStyle: {
              color: 'rgb(35 25 16 / 0.1)',
              borderColor: '#231910',
              borderWidth: 1,
            },
            tooltip: { show: false },
          },
        ]
      : [
          {
            name: 'Abiertos',
            value: status.open,
            itemStyle: {
              color: NOVEX_ATTENTION_COLORS.open,
              borderColor: '#231910',
              borderWidth: 1.4,
            },
          },
          {
            name: 'En atención',
            value: status.inProgress,
            itemStyle: {
              color: NOVEX_ATTENTION_COLORS.inProgress,
              borderColor: '#231910',
              borderWidth: 1.4,
            },
          },
          ...extra.map((item) => ({
            name: item.name,
            value: item.value,
            itemStyle: {
              color: item.color,
              borderColor: '#231910',
              borderWidth: 1.4,
            },
          })),
        ]

  return {
    animationDuration: 320,
    animationEasing: 'cubicOut',
    xAxis: { show: false },
    yAxis: { show: false },
    title: {
      text: String(total),
      subtext: total === 1 ? 'activo' : 'activos',
      left: 'center',
      top: '38%',
      textAlign: 'center',
      textStyle: {
        fontSize: 22,
        fontWeight: 800,
        color: '#231910',
        fontFamily: DEFAULT_NOVEX_CHART_TOKENS.fontFamily,
        lineHeight: 24,
      },
      subtextStyle: {
        fontSize: 10,
        fontWeight: 700,
        color: 'rgb(35 25 16 / 0.55)',
        fontFamily: DEFAULT_NOVEX_CHART_TOKENS.fontFamily,
        textTransform: 'uppercase' as unknown as undefined,
      },
      itemGap: 2,
    },
    series: [
      {
        type: 'pie',
        name: 'Estado de atención',
        radius: ['52%', '74%'],
        center: ['50%', '48%'],
        avoidLabelOverlap: true,
        silent: total === 0,
        data,
        label: { show: false },
        labelLine: { show: false },
        emphasis: {
          scale: true,
          scaleSize: 4,
          itemStyle: {
            shadowBlur: 0,
            borderWidth: 1.8,
          },
        },
        itemStyle: {
          borderRadius: 3,
        },
      },
    ],
    tooltip: {
      trigger: 'item',
      formatter: (params: unknown) => {
        if (total === 0) return 'Sin problemas activos'
        const item = params as {
          name?: string
          value?: number
          percent?: number
        }
        const name = item.name ?? ''
        const value = item.value ?? 0
        const pct = Math.round(item.percent ?? 0)
        return `<div style="font-weight:800;margin-bottom:2px">${name}</div>${value} · ${pct} %`
      },
    },
  }
}

/** Porcentajes para labels HTML compactos bajo el donut. */
export function attentionPercents(status: AttentionComposition): {
  openPct: number
  progressPct: number
  closedAfterPct: number
  total: number
} {
  const total = attentionTotal(status)
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0)
  return {
    openPct: pct(status.open),
    progressPct: pct(status.inProgress),
    closedAfterPct: pct(status.closedAfterCut ?? 0),
    total,
  }
}

export function SeverityBarsChart({
  severity,
}: {
  severity: OperationalKpiSeverityCounts
}) {
  const aria = `Severidad: baja ${severity.low}, media ${severity.medium}, alta ${severity.high}, crítica ${severity.critical}.`

  return (
    <NovexEChart
      option={buildSeverityBarsOption(severity)}
      ariaLabel={aria}
      testId="director-estado-severity-chart"
      height={COMPOSITION_CHART_HEIGHT}
      className="novex-chart--composition"
    />
  )
}

export function AttentionDonutChart({
  status,
}: {
  status: AttentionComposition
}) {
  const total = attentionTotal(status)
  const after = status.closedAfterCut ?? 0
  const aria = `${status.open} abiertos y ${status.inProgress} en atención${
    after > 0 ? `, ${after} solucionados después del corte` : ''
  }; ${total} activos.`

  return (
    <NovexEChart
      option={buildAttentionDonutOption(status)}
      ariaLabel={aria}
      testId="director-estado-attention-chart"
      height={COMPOSITION_CHART_HEIGHT}
      className="novex-chart--composition"
    />
  )
}
