/**
 * Opciones y helpers puros de la lámina 2 de ESTADO («Severidad y atención»)
 * en scope coordinación. La lectura de Dirección (scope live) sigue con las
 * barras verticales de DirectorEstadoCompositionCharts: esta lámina no la
 * altera.
 */
import type { EChartsCoreOption } from 'echarts/core'
import {
  attentionTotal,
  buildAttentionDonutOption,
  NOVEX_ATTENTION_COLORS,
  NOVEX_SEVERITY_COLORS,
  type AttentionComposition,
} from '@/modules/operational-cards/charts/DirectorEstadoCompositionCharts'
import { DEFAULT_NOVEX_CHART_TOKENS } from '@/modules/operational-cards/charts/novex-chart-theme'
import type { OperationalKpiSeverityCounts } from '@/modules/operational-cards/types/operational-kpi.types'

/* ─────────────── Severidad en filas horizontales ─────────────── */

/** Orden de lectura fijo: de mayor a menor gravedad. */
export const SEVERITY_ROWS: ReadonlyArray<{
  key: keyof OperationalKpiSeverityCounts
  label: string
}> = [
  { key: 'critical', label: 'Crítica' },
  { key: 'high', label: 'Alta' },
  { key: 'medium', label: 'Media' },
  { key: 'low', label: 'Baja' },
]

const ROW_STEPS = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000] as const

/**
 * Escala ÚNICA para las cuatro filas: origen 0, divisiones enteras (≤ 4) y
 * máximo múltiplo exacto del intervalo. Nunca una escala por categoría.
 */
export function severityRowsScale(peak: number): { max: number; interval: number } {
  const top = Math.max(1, peak)
  const interval = ROW_STEPS.find((step) => Math.ceil(top / step) <= 4) ?? Math.ceil(top / 4)
  return { max: Math.ceil(top / interval) * interval, interval }
}

/** Alto de la gráfica: cuatro filas legibles (30 px) + eje inferior. */
export const SEVERITY_ROWS_HEIGHT = 4 * 30 + 26

const ZERO_LABEL = { color: 'rgb(35 25 16 / 0.5)', fontWeight: 700 } as const

export function buildSeverityRowsOption(
  severity: OperationalKpiSeverityCounts,
): EChartsCoreOption {
  const font = DEFAULT_NOVEX_CHART_TOKENS.fontFamily
  const values = SEVERITY_ROWS.map((row) => severity[row.key])
  const total = values.reduce((sum, value) => sum + value, 0)
  const scale = severityRowsScale(Math.max(0, ...values))
  return {
    animationDuration: 320,
    animationEasing: 'cubicOut',
    // Márgenes fijos: nombre a la izquierda, cifra al final de cada barra.
    grid: { left: 62, right: 34, top: 4, bottom: 22, containLabel: false },
    yAxis: {
      type: 'category',
      data: SEVERITY_ROWS.map((row) => row.label),
      // La primera categoría (Crítica) arriba.
      inverse: true,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: {
        color: '#231910',
        fontSize: 11,
        fontWeight: 800,
        fontFamily: font,
        margin: 10,
      },
    },
    xAxis: {
      type: 'value',
      min: 0,
      max: scale.max,
      interval: scale.interval,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: true, lineStyle: { color: 'rgb(35 25 16 / 0.1)', type: 'dashed' } },
      axisLabel: {
        color: 'rgb(35 25 16 / 0.62)',
        fontSize: 9.5,
        fontWeight: 700,
        fontFamily: font,
        formatter: (value: number) => String(Math.round(value)),
      },
    },
    series: [
      {
        type: 'bar',
        name: 'Severidad',
        barWidth: 14,
        data: values.map((value, index) => ({
          value,
          itemStyle: {
            color: NOVEX_SEVERITY_COLORS[SEVERITY_ROWS[index].key],
            borderColor: '#231910',
            borderWidth: value === 0 ? 0 : 1.1,
            borderRadius: [0, 4, 4, 0],
          },
          // Un 0 real se rotula (atenuado) junto al origen: visible sin tooltip.
          ...(value === 0 ? { label: ZERO_LABEL } : {}),
        })),
        label: {
          show: true,
          position: 'right',
          distance: 6,
          color: '#231910',
          fontSize: 11.5,
          fontWeight: 800,
          fontFamily: font,
          formatter: (params: { value?: number }) => String(params.value ?? 0),
        },
        emphasis: { itemStyle: { borderWidth: 1.6 } },
      },
    ],
    tooltip: {
      trigger: 'item',
      confine: true,
      formatter: (params: unknown) => {
        const item = params as { dataIndex?: number; value?: number }
        const row = SEVERITY_ROWS[item.dataIndex ?? 0]
        const value = item.value ?? 0
        const pct = total > 0 ? Math.round((value / total) * 100) : 0
        return `<div style="font-weight:800;margin-bottom:2px">Severidad ${row.label.toLowerCase()}</div>${value} de ${total} activos · ${pct} %`
      },
    },
  }
}

export function severityRowsDescription(severity: OperationalKpiSeverityCounts): string {
  const total = SEVERITY_ROWS.reduce((sum, row) => sum + severity[row.key], 0)
  return `Severidad de los ${total} activos: ${SEVERITY_ROWS.map(
    (row) => `${row.label.toLowerCase()} ${severity[row.key]}`,
  ).join(', ')}.`
}

/* ─────────────── Dona compacta de Atención ─────────────── */

/** Lado de la dona compacta (px): el anillo acompaña a su leyenda. */
export const COMPACT_DONUT_SIZE = 132

/**
 * Misma dona (datos, colores, orden y tooltip) que la de Dirección, ajustada
 * a un bloque pequeño: anillo centrado algo más grueso y el total centrado
 * de verdad. En el título original `left: 'center'` + `textAlign: 'center'`
 * centraban dos veces y, en un lienzo estrecho, el «13 activos» pisaba el
 * anillo.
 */
export function buildCompactAttentionDonutOption(status: AttentionComposition): EChartsCoreOption {
  const base = buildAttentionDonutOption(status) as EChartsCoreOption & {
    title: Record<string, unknown>
    series: Array<Record<string, unknown>>
  }
  const total = attentionTotal(status)
  const font = DEFAULT_NOVEX_CHART_TOKENS.fontFamily
  return {
    ...base,
    // Ancla en el 50 % + textAlign center (un solo centrado), dos líneas rich.
    title: {
      text: `{n|${total}}\n{l|${total === 1 ? 'activo' : 'activos'}}`,
      subtext: '',
      left: '50%',
      top: '50%',
      textAlign: 'center',
      textVerticalAlign: 'middle',
      textStyle: {
        rich: {
          n: { fontSize: 20, fontWeight: 800, color: '#231910', fontFamily: font, lineHeight: 22, align: 'center' },
          l: {
            fontSize: 9.5,
            fontWeight: 700,
            color: 'rgb(35 25 16 / 0.62)',
            fontFamily: font,
            lineHeight: 12,
            align: 'center',
          },
        },
      },
    },
    series: base.series.map((serie) => ({
      ...serie,
      radius: ['60%', '92%'],
      center: ['50%', '50%'],
    })),
  }
}

/* ─────────────── Leyenda de la dona de Atención ─────────────── */

export type AttentionRowKey = 'open' | 'progress' | 'closed-after' | 'unclassified'

export type AttentionRow = {
  key: AttentionRowKey
  label: string
  count: number
  pct: number
  color: string
}

/**
 * Porcentajes enteros que suman EXACTAMENTE 100 (método del mayor resto)
 * sobre el total. Con total 0 todos son 0: no hay distribución que mostrar.
 */
export function wholePercents(counts: readonly number[]): number[] {
  const total = counts.reduce((sum, n) => sum + n, 0)
  if (total === 0) return counts.map(() => 0)
  const raw = counts.map((n) => (n / total) * 100)
  const floors = raw.map(Math.floor)
  let rest = 100 - floors.reduce((sum, n) => sum + n, 0)
  const order = raw
    .map((value, index) => ({ index, frac: value - Math.floor(value) }))
    .sort((a, b) => b.frac - a.frac || a.index - b.index)
  for (const { index } of order) {
    if (rest <= 0) break
    floors[index] += 1
    rest -= 1
  }
  return floors
}

/**
 * Filas de la leyenda en el MISMO orden y color que la dona:
 * Abiertos · En atención · Cerrados después del corte · Sin clasificar.
 * «Cerrados después del corte» se muestra en todo corte histórico (aunque
 * sea 0: es una categoría propia de esa lectura); en el corte de hoy el
 * contrato la fija en 0 y se omite. «Sin clasificar» solo si existe (dato
 * inconsistente que nunca se pierde). Los porcentajes se calculan sobre el
 * total de TODAS las categorías (= activos al corte, validado por el parser).
 */
export function attentionRows(
  status: AttentionComposition,
  { historical }: { historical: boolean },
): AttentionRow[] {
  const closedAfter = status.closedAfterCut ?? 0
  const unclassified = status.unclassified ?? 0
  const pcts = wholePercents([status.open, status.inProgress, closedAfter, unclassified])
  const rows: AttentionRow[] = [
    {
      key: 'open',
      label: 'Abiertos',
      count: status.open,
      pct: pcts[0],
      color: NOVEX_ATTENTION_COLORS.open,
    },
    {
      key: 'progress',
      label: 'En atención',
      count: status.inProgress,
      pct: pcts[1],
      color: NOVEX_ATTENTION_COLORS.inProgress,
    },
  ]
  if (historical || closedAfter > 0) {
    rows.push({
      key: 'closed-after',
      label: 'Cerrados después del corte',
      count: closedAfter,
      pct: pcts[2],
      color: NOVEX_ATTENTION_COLORS.closedAfterCut,
    })
  }
  if (unclassified > 0) {
    rows.push({
      key: 'unclassified',
      label: 'Sin clasificar',
      count: unclassified,
      pct: pcts[3],
      color: NOVEX_ATTENTION_COLORS.unclassified,
    })
  }
  return rows
}
