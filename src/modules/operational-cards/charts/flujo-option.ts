/**
 * Opciones ECharts y formato de la CARGA y el MOVIMIENTO DE PROBLEMAS (módulo puro, testeable
 * sin DOM). Los componentes viven en DirectorFlujoChart.tsx.
 */
import type { EChartsCoreOption } from 'echarts/core'
import {
  DEFAULT_NOVEX_CHART_TOKENS,
  NOVEX_FLOW_TOKENS,
} from '@/modules/operational-cards/charts/novex-chart-theme'
import { flujoCoverageTag } from '@/modules/operational-cards/charts/flujo-coverage'
import {
  flujoTooltipHtml,
  movimientoTooltipHtml,
} from '@/modules/operational-cards/charts/flujo-tooltip'
import type { OperationalKpiFlowBucket } from '@/modules/operational-cards/types/operational-kpi.types'

/**
 * Alto de reserva del host antes de medir. El alto real lo fija el CSS de la
 * lámina (`.director-flujo__frame`), contenido: ya no se estira al panel.
 */
export const FLUJO_CHART_HEIGHT = 200

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
  closed: 'Cerrados',
  reported: 'Reportados',
} as const

/** Un cero real se rotula atenuado: se reconoce sin competir con las cifras. */
const ZERO_LABEL = {
  color: 'rgb(35 25 16 / 0.5)',
  fontWeight: 700,
  fontSize: 9.5,
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

/** Marca del eje: la de cobertura (lámina 1) o solo ACTUAL (otras láminas). */
function axisTagOf(bucket: OperationalKpiFlowBucket, coverageTags: boolean): string | null {
  if (coverageTags) return flujoCoverageTag(bucket)
  return bucket.current ? 'ACTUAL' : null
}

/**
 * Eje temporal COMPARTIDO por Carga y Movimiento (y reutilizado por
 * Resolución): mismas categorías, mismas etiquetas (futuros atenuados) y un
 * eje gemelo oculto para la banda. `coverageTags` (solo «Carga y movimiento»)
 * marca además los tramos incompletos (EN CURSO / PARCIAL); sin él, el eje
 * conserva su marca previa (ACTUAL) para no alterar otras láminas.
 */
export function temporalAxes(
  buckets: readonly OperationalKpiFlowBucket[],
  level: FlujoLevel,
  { coverageTags = false }: { coverageTags?: boolean } = {},
) {
  const font = DEFAULT_NOVEX_CHART_TOKENS.fontFamily
  const categories = buckets.map((bucket) => {
    const text = flujoAxisTick(bucket, level)
    // Días: el día de la semana encima del número («LUN» / «5») para que
    // siete columnas quepan en media Lectura sin pisarse.
    const [head, tail] = level === 'day' ? text.split(' ') : [null, text]
    const tone = bucket.future ? 'future' : 'name'
    const main = head ? `{${tone}Dow|${head}}\n{${tone}|${tail}}` : `{${tone}|${tail}}`
    // Tramo incompleto: marca breve. Las cifras son las reales del tramo: no
    // se normalizan ni se proyectan.
    const tag = axisTagOf(bucket, coverageTags)
    if (tag) return `${main}\n{${tag === 'PARCIAL' ? 'partialTag' : 'currentTag'}|${tag}}`
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
          partialTag: {
            fontFamily: font,
            fontSize: 8,
            fontWeight: 700,
            color: 'rgb(35 25 16 / 0.72)',
          },
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

/**
 * Área de trazado ALINEADA entre Carga y Movimiento: márgenes fijos, sin
 * `containLabel`, para que el ancho de las cifras del eje Y no desplace el
 * plot y cada columna caiga exactamente bajo la de la otra gráfica. El margen
 * inferior reserva las líneas de la etiqueta del eje (día y marca de tramo).
 */
export function flujoGrid(buckets: readonly OperationalKpiFlowBucket[], level: FlujoLevel) {
  const lines = (level === 'day' ? 2 : 1) + (buckets.some((b) => flujoCoverageTag(b)) ? 1 : 0)
  return { left: 34, right: 14, top: 24, bottom: 12 + lines * 14, containLabel: false }
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
    grid: flujoGrid(buckets, level),
    xAxis: temporalAxes(buckets, level, { coverageTags: true }),
    yAxis: {
      type: 'value',
      min: 0,
      max: scale.max,
      interval: scale.interval,
      // Cifras del eje algo más legibles que el `muted` del tema (0,55).
      axisLabel: {
        color: 'rgb(35 25 16 / 0.72)',
        fontSize: 10,
        fontWeight: 700,
        fontFamily: DEFAULT_NOVEX_CHART_TOKENS.fontFamily,
        formatter: (value: number) => String(Math.round(value)),
      },
    },
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

/** Con pocos puntos (ciclo ≤ 6, mes ≤ 6, semana ≤ 7) todos llevan su cifra. */
export const FLUJO_LABEL_ALL_MAX = 8

/**
 * Puntos rotulados de la línea cuando NO caben todos: el actual (o último con
 * dato) y el máximo. El resto se lee con hover.
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
  const knownIndexes = totals.flatMap((value, index) => (value === null ? [] : [index]))
  const labeled =
    knownIndexes.length <= FLUJO_LABEL_ALL_MAX ? new Set(knownIndexes) : flujoLabeledIndexes(totals)

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
 * Reportados (created_at) vs Cerrados (closed_at dentro del tramo). Mismo eje
 * temporal, misma banda y misma área de trazado que la Carga; escala Y propia.
 * Un 0 real lleva su «0» atenuado; un tramo futuro no tiene valor (null).
 */
export function buildMovimientoOption(
  buckets: readonly OperationalKpiFlowBucket[],
  level: FlujoLevel,
): EChartsCoreOption {
  const radius = DEFAULT_NOVEX_CHART_TOKENS.barRadius
  // Futuro: sin barra (null), nunca 0. Cerrados = solved.total (closed_at).
  const reported = buckets.map((b) => (b.future || !b.solved ? null : (b.created ?? 0)))
  const closed = buckets.map((b) => (b.solved ? b.solved.total : null))
  const scale = flujoScale([...reported, ...closed])
  const barWidth = barWidthFor(buckets, level)
  const label = valueLabel((_index, value) => String(value))
  const item = (value: number | null) => ({
    value,
    itemStyle: zeroless(value),
    ...(value === 0 ? { label: ZERO_LABEL } : {}),
  })

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
        data: reported.map(item),
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
        name: SERIES.closed,
        z: 2,
        data: closed.map(item),
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
