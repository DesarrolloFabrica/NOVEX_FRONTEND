/**
 * Opciones ECharts y formato de la CARGA y el MOVIMIENTO DE PROBLEMAS (módulo puro, testeable
 * sin DOM). Los componentes viven en DirectorFlujoChart.tsx.
 */
import type { EChartsCoreOption } from 'echarts/core'
import {
  DEFAULT_NOVEX_CHART_TOKENS,
  NOVEX_FLOW_TOKENS,
  NOVEX_SAFE_GRID,
} from '@/modules/operational-cards/charts/novex-chart-theme'
import {
  flujoTooltipHtml,
  movimientoTooltipHtml,
} from '@/modules/operational-cards/charts/flujo-tooltip'
import type { OperationalKpiFlowBucket } from '@/modules/operational-cards/types/operational-kpi.types'

export const FLUJO_CHART_HEIGHT = 236

const MONTH_SHORT = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'] as const
const MONTH_LONG = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const
const WEEKDAY_SHORT = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'] as const
const WEEKDAY_LONG = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'] as const

export type FlujoLevel = 'month' | 'week' | 'day'

function parts(ymd: string) {
  const [year, month, day] = ymd.split('-').map(Number)
  // Mediodía UTC: el día de la semana no depende de la zona del navegador.
  const weekday = new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay()
  return { year, monthIndex: month - 1, day, weekday }
}

/** Eje: «OCT», «1–4 OCT», «LUN 5». */
export function flujoAxisLabel(bucket: OperationalKpiFlowBucket, level: FlujoLevel): string {
  const start = parts(bucket.start)
  const end = parts(bucket.end)
  if (level === 'month') return MONTH_SHORT[start.monthIndex]
  if (level === 'day') return `${WEEKDAY_SHORT[start.weekday]} ${start.day}`
  if (start.monthIndex === end.monthIndex) {
    return start.day === end.day
      ? `${start.day} ${MONTH_SHORT[end.monthIndex]}`
      : `${start.day}–${end.day} ${MONTH_SHORT[end.monthIndex]}`
  }
  return `${start.day} ${MONTH_SHORT[start.monthIndex]}–${end.day} ${MONTH_SHORT[end.monthIndex]}`
}

/**
 * Etiqueta COMPACTA del eje: con dos gráficas lado a lado, las semanas de un
 * mes muestran solo el rango de días («5–11»); el mes ya está en la ruta.
 */
export function flujoAxisTick(bucket: OperationalKpiFlowBucket, level: FlujoLevel): string {
  if (level !== 'week') return flujoAxisLabel(bucket, level)
  const start = parts(bucket.start)
  const end = parts(bucket.end)
  if (start.monthIndex !== end.monthIndex) return flujoAxisLabel(bucket, level)
  return start.day === end.day ? String(start.day) : `${start.day}–${end.day}`
}

/** Título humano del bucket (tooltip y accesibilidad). */
export function flujoBucketTitle(bucket: OperationalKpiFlowBucket, level: FlujoLevel): string {
  const start = parts(bucket.start)
  if (level === 'month') {
    const name = MONTH_LONG[start.monthIndex]
    return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${start.year}`
  }
  if (level === 'day') {
    return `${WEEKDAY_LONG[start.weekday]} ${start.day} ${MONTH_SHORT[start.monthIndex].toLowerCase()}`
  }
  return flujoAxisLabel(bucket, level).toLowerCase()
}

const SERIES = {
  band: '__banda',
  active: 'Activos',
  solved: 'Solucionados',
  reported: 'Reportados',
} as const

const BAR_BORDER = { borderColor: '#231910', borderWidth: 1.2 } as const

const SOLVED_DECAL = {
  symbol: 'line',
  rotation: -Math.PI / 4,
  dashArrayX: [1, 0],
  dashArrayY: [2, 3],
  color: NOVEX_FLOW_TOKENS.resolvedDecal,
}

// Un 0 real no dibuja una rayita de borde (barra de altura cero).
const zeroless = (value: number | null) => (value === 0 ? { borderWidth: 0 } : {})

const NICE_STEPS = [1, 2, 3, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000] as const

/**
 * Escala Y con aire para el rótulo superior y un máximo múltiplo exacto del
 * intervalo (≤ 5 divisiones): nunca dos etiquetas pegadas («12» y «13»).
 */
export function flujoScale(values: ReadonlyArray<number | null>): { max: number; interval: number } {
  const peak = Math.max(0, ...values.map((v) => v ?? 0))
  const raw = Math.max(2, Math.ceil(peak * 1.22))
  const interval = NICE_STEPS.find((step) => Math.ceil(raw / step) <= 5) ?? Math.ceil(raw / 5)
  return { max: Math.ceil(raw / interval) * interval, interval }
}

function barWidthFor(buckets: readonly OperationalKpiFlowBucket[], level: FlujoLevel): number {
  return level === 'day' ? 18 : buckets.length <= 6 ? 28 : 24
}

function valueLabel(format: (index: number, value: number) => string) {
  return {
    show: true,
    position: 'top' as const,
    distance: 4,
    fontSize: 10.5,
    fontWeight: 800,
    color: '#231910',
    fontFamily: DEFAULT_NOVEX_CHART_TOKENS.fontFamily,
    formatter: (params: { dataIndex: number; value?: number | null }) =>
      format(params.dataIndex, params.value ?? 0),
  }
}

/**
 * Eje temporal COMPARTIDO por Carga y Movimiento: mismas categorías, mismas
 * etiquetas (ACTUAL; futuros atenuados) y un eje gemelo oculto para la banda.
 */
export function temporalAxes(buckets: readonly OperationalKpiFlowBucket[], level: FlujoLevel) {
  const font = DEFAULT_NOVEX_CHART_TOKENS.fontFamily
  const categories = buckets.map((bucket) => {
    const text = flujoAxisTick(bucket, level)
    // Días: el día de la semana encima del número («LUN» / «5») para que
    // siete columnas quepan en media Lectura sin pisarse.
    const [head, tail] = level === 'day' ? text.split(' ') : [null, text]
    const tone = bucket.future ? 'future' : 'name'
    const main = head ? `{${tone}Dow|${head}}\n{${tone}|${tail}}` : `{${tone}|${tail}}`
    // Futuro: etiqueta atenuada, sin marca extra (no satura ejes estrechos).
    if (bucket.current) return `${main}\n{currentTag|ACTUAL}`
    return main
  })
  return [
    {
      type: 'category',
      data: categories,
      axisTick: { show: false },
      axisLabel: {
        interval: 0,
        lineHeight: 14,
        rich: {
          name: { fontFamily: font, fontSize: 10.5, fontWeight: 800, color: '#231910' },
          future: { fontFamily: font, fontSize: 10.5, fontWeight: 700, color: NOVEX_FLOW_TOKENS.future },
          nameDow: { fontFamily: font, fontSize: 8.5, fontWeight: 800, color: '#231910' },
          futureDow: { fontFamily: font, fontSize: 8.5, fontWeight: 700, color: NOVEX_FLOW_TOKENS.future },
          currentTag: { fontFamily: font, fontSize: 8, fontWeight: 800, color: '#231910' },
        },
      },
    },
    // Eje gemelo oculto solo para la banda (ancho completo de la categoría).
    { type: 'category', data: categories, show: false },
  ]
}

/**
 * Banda transparente a todo el ancho de la categoría (serie índice 0): da el
 * tooltip resumen, resalta la columna y es la que sincroniza el hover.
 */
export function bandSeries(buckets: readonly OperationalKpiFlowBucket[], yMax: number) {
  return {
    type: 'bar',
    name: SERIES.band,
    xAxisIndex: 1,
    data: buckets.map((bucket) => (bucket.future ? null : yMax)),
    barWidth: '100%',
    z: 0,
    animation: false,
    itemStyle: { color: 'rgba(0, 0, 0, 0)' },
    emphasis: { itemStyle: { color: 'rgb(35 25 16 / 0.06)' } },
    label: { show: false },
  }
}

function baseOption(
  buckets: readonly OperationalKpiFlowBucket[],
  level: FlujoLevel,
  scale: { max: number; interval: number },
  formatter: (bucket: OperationalKpiFlowBucket, seriesName: string) => string,
) {
  return {
    animationDurationUpdate: 220,
    animationEasingUpdate: 'cubicOut' as const,
    grid: { ...NOVEX_SAFE_GRID, top: 22, bottom: 6 },
    xAxis: temporalAxes(buckets, level),
    yAxis: { type: 'value', min: 0, max: scale.max, interval: scale.interval },
    tooltip: {
      trigger: 'item',
      confine: true,
      formatter: (params: unknown) => {
        const item = params as { dataIndex?: number; seriesName?: string }
        const bucket = buckets[item.dataIndex ?? 0]
        return bucket ? formatter(bucket, item.seriesName ?? '') : ''
      },
    },
  }
}

/**
 * Puntos rotulados de la línea: el actual (o último con dato) y el máximo.
 * El resto se lee con hover: sin ruido de etiquetas en cada punto.
 */
export function flujoLabeledIndexes(totals: ReadonlyArray<number | null>): Set<number> {
  const known = totals.flatMap((value, index) => (value === null ? [] : [index]))
  const labeled = new Set<number>()
  if (known.length === 0) return labeled
  labeled.add(known[known.length - 1])
  let peak = known[0]
  for (const index of known) if ((totals[index] ?? 0) > (totals[peak] ?? 0)) peak = index
  if ((totals[peak] ?? 0) > 0) labeled.add(peak)
  return labeled
}

/**
 * CARGA DE PROBLEMAS = STOCK: una LÍNEA del total de ACTIVOS al cierre de
 * cada bucket (snapshots discretos → tramos rectos, sin spline), con un área
 * muy suave debajo. Eje Y desde 0 (cantidad absoluta). La línea termina en el
 * último bucket con dato: los futuros no se dibujan ni se interpolan.
 * Internos / Externos viven en el tooltip (con sus desgloses), no como
 * series. La banda transparente (serie 0) mantiene hover y click por columna.
 */
export function buildFlujoOption(
  buckets: readonly OperationalKpiFlowBucket[],
  level: FlujoLevel,
): EChartsCoreOption {
  const font = DEFAULT_NOVEX_CHART_TOKENS.fontFamily
  // Futuro: null → la línea se corta, nunca baja a 0.
  const totals = buckets.map((b) => (b.active ? b.active.total : null))
  const scale = flujoScale(totals)
  const labeled = flujoLabeledIndexes(totals)

  return {
    ...baseOption(buckets, level, scale, (bucket) =>
      flujoTooltipHtml(bucket, flujoBucketTitle(bucket, level)),
    ),
    series: [
      bandSeries(buckets, scale.max),
      {
        type: 'line',
        name: SERIES.active,
        z: 3,
        // Sin animación de entrada: con repintados (resize/hover) los símbolos
        // de la línea quedaban congelados en escala 0 en el navegador.
        animation: false,
        smooth: false,
        connectNulls: false,
        symbol: 'circle',
        symbolSize: 7,
        showAllSymbol: true,
        lineStyle: { color: NOVEX_FLOW_TOKENS.internal, width: 2.2 },
        itemStyle: {
          color: '#fbf6ea',
          borderColor: NOVEX_FLOW_TOKENS.internal,
          borderWidth: 2,
        },
        areaStyle: { color: NOVEX_FLOW_TOKENS.activeArea },
        emphasis: { focus: 'none', scale: 1.45 },
        data: totals.map((value, index) => {
          if (value === null) return null
          const current = buckets[index]?.current
          return {
            value,
            // Punto actual: algo más de presencia, relleno oscuro (sin rojo).
            ...(current
              ? {
                  symbolSize: 10,
                  itemStyle: { color: NOVEX_FLOW_TOKENS.internal, borderColor: '#fbf6ea' },
                }
              : {}),
            label: {
              show: labeled.has(index),
              position: 'top' as const,
              distance: 7,
              fontSize: 10.5,
              fontWeight: 800,
              color: '#231910',
              fontFamily: font,
            },
          }
        }),
      },
    ],
  }
}

/**
 * MOVIMIENTO DE PROBLEMAS (eventos dentro de cada bucket), barras agrupadas:
 * Reportados (created_at) vs Solucionados (closed_at). Mismo eje temporal y
 * misma banda que la Carga; escala Y propia.
 */
export function buildMovimientoOption(
  buckets: readonly OperationalKpiFlowBucket[],
  level: FlujoLevel,
): EChartsCoreOption {
  const radius = DEFAULT_NOVEX_CHART_TOKENS.barRadius
  // Futuro: sin barra (null), nunca 0. Solucionados = mismo dato que la Carga.
  const reported = buckets.map((b) => (b.future || !b.solved ? null : (b.created ?? 0)))
  const solved = buckets.map((b) => (b.solved ? b.solved.total : null))
  const scale = flujoScale([...reported, ...solved])
  const barWidth = barWidthFor(buckets, level)
  const label = valueLabel((_index, value) => (value > 0 ? String(value) : ''))

  return {
    ...baseOption(buckets, level, scale, (bucket) =>
      movimientoTooltipHtml(bucket, flujoBucketTitle(bucket, level)),
    ),
    series: [
      bandSeries(buckets, scale.max),
      {
        type: 'bar',
        name: SERIES.reported,
        z: 2,
        data: reported.map((value) => ({ value, itemStyle: zeroless(value) })),
        barMaxWidth: barWidth,
        barGap: '22%',
        barCategoryGap: '34%',
        itemStyle: {
          color: NOVEX_FLOW_TOKENS.reported,
          ...BAR_BORDER,
          borderRadius: [radius, radius, 2, 2],
        },
        emphasis: { focus: 'none', itemStyle: { color: NOVEX_FLOW_TOKENS.reportedHover } },
        label,
      },
      {
        type: 'bar',
        name: SERIES.solved,
        z: 2,
        data: solved.map((value) => ({ value, itemStyle: zeroless(value) })),
        barMaxWidth: barWidth,
        itemStyle: {
          color: NOVEX_FLOW_TOKENS.resolved,
          ...BAR_BORDER,
          borderRadius: [radius, radius, 2, 2],
          decal: SOLVED_DECAL,
        },
        emphasis: { focus: 'none', itemStyle: { color: NOVEX_FLOW_TOKENS.resolvedHover } },
        label,
      },
    ],
  }
}
