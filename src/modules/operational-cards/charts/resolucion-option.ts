import type { EChartsCoreOption } from 'echarts/core'
import {
  DEFAULT_NOVEX_CHART_TOKENS,
  inkAlpha,
  NOVEX_RESOLUTION_TOKENS,
  NOVEX_SAFE_GRID,
} from '@/modules/operational-cards/charts/novex-chart-theme'
import {
  bandSeries,
  flujoBucketTitle,
  temporalAxes,
  type FlujoLevel,
} from '@/modules/operational-cards/charts/flujo-option'
import type {
  OperationalKpiFlowBucket,
  OperationalKpiResolution,
  OperationalKpiResolutionBandKey,
  OperationalKpiResolutionBucket,
} from '@/modules/operational-cards/types/operational-kpi.types'

/**
 * RESOLUCIÓN (módulo puro, testeable sin DOM). Las duraciones llegan del
 * backend en días decimales EXACTOS (closed_at − created_at): aquí solo se
 * presentan, nunca se recalculan.
 *   · TIEMPO DE RESOLUCIÓN — mediana por bucket (línea, mismo eje temporal
 *     que Carga | Movimiento).
 *   · TIEMPO HASTA SOLUCIÓN — los cierres del periodo por rango (barras).
 */

/** Por debajo de este n no se muestra el P75 (con < 4 cierres ≈ el máximo). */
export const RESOLUTION_P75_MIN_COUNT = 4
/** Por debajo de este n el punto se dibuja hueco: «pocos cierres». */
export const RESOLUTION_LOW_N = 3

/**
 * Duración legible:
 *   < 1 h → «< 1 h» · < 1 día → horas enteras («6 h») · 1–10 días → un
 *   decimal («1,4 d») · ≥ 10 días → entero («31 d»).
 * `long` usa «días» en vez de «d» (tooltips y textos).
 */
export function formatResolutionDuration(days: number, options: { long?: boolean } = {}): string {
  const dayUnit = options.long ? 'días' : 'd'
  const hours = days * 24
  if (hours < 1) return '< 1 h'
  if (days < 1) return `${Math.min(23, Math.round(hours))} h`
  const oneDecimal = Math.round(days * 10) / 10
  if (oneDecimal < 10) return `${oneDecimal.toFixed(1).replace('.', ',')} ${dayUnit}`
  return `${Math.round(days)} ${dayUnit}`
}

/** Etiquetas del eje Y: siempre DÍAS numéricos (sin mezclar unidades). */
export function formatResolutionAxisDays(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace('.', ',')
}

export const RESOLUTION_BANDS: ReadonlyArray<{
  key: OperationalKpiResolutionBandKey
  label: string
}> = [
  { key: 'lt-1d', label: '< 1 día' },
  { key: '1-3d', label: '1–3 días' },
  { key: '3-7d', label: '3–7 días' },
  { key: '7-14d', label: '7–14 días' },
  { key: '14-30d', label: '14–30 días' },
  { key: '30d+', label: '30+ días' },
]

export function resolutionBandColor(bandIndex: number): string {
  const alpha = NOVEX_RESOLUTION_TOKENS.bandAlphas[bandIndex] ?? 0.5
  return inkAlpha(NOVEX_RESOLUTION_TOKENS.base, alpha)
}

/** Porcentaje entero de los cierres del periodo. */
export function resolutionBandPercent(count: number, closedCount: number): number {
  return closedCount > 0 ? Math.round((count / closedCount) * 100) : 0
}

export function resolutionBandCounts(resolution: Pick<OperationalKpiResolution, 'distribution'>): number[] {
  return RESOLUTION_BANDS.map(
    (meta) => resolution.distribution.find((band) => band.key === meta.key)?.count ?? 0,
  )
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Tooltip de un bucket de la línea: [título, filas etiqueta/valor, nota].
 * Mediana + Solucionados siempre; P75 redactado («75 % en menos de …») solo
 * con n ≥ 4; «Pocos cierres» con n < 3. Sin cierres: lo dice, sin «0 días».
 */
export function resolucionTooltipLines(
  title: string,
  bucket: OperationalKpiResolutionBucket,
): { title: string; rows: Array<[string, string]>; note: string | null } {
  const n = bucket.closedCount ?? 0
  if (n === 0 || bucket.medianDays === null) {
    return { title: title.toUpperCase(), rows: [], note: 'Sin problemas solucionados en este periodo' }
  }
  const rows: Array<[string, string]> = [
    ['Mediana', formatResolutionDuration(bucket.medianDays, { long: true })],
    ['Solucionados', String(n)],
  ]
  if (n >= RESOLUTION_P75_MIN_COUNT && bucket.p75Days !== null) {
    rows.push(['75 % en menos de', formatResolutionDuration(bucket.p75Days, { long: true })])
  }
  return {
    title: title.toUpperCase(),
    rows,
    note: n < RESOLUTION_LOW_N ? 'Pocos cierres en este periodo' : null,
  }
}

export function resolucionTooltipHtml(title: string, bucket: OperationalKpiResolutionBucket): string {
  const { title: head, rows, note } = resolucionTooltipLines(title, bucket)
  return [
    `<div style="font-weight:800;margin-bottom:4px;letter-spacing:.04em">${escapeHtml(head)}</div>`,
    ...rows.map(
      ([label, value]) =>
        `<div style="display:flex;justify-content:space-between;gap:18px"><span>${escapeHtml(label)}</span><b>${escapeHtml(value)}</b></div>`,
    ),
    note ? `<div style="margin-top:4px;font-style:italic;opacity:.7">${escapeHtml(note)}</div>` : '',
  ].join('')
}

const SCALE_STEPS = [0.25, 0.5, 1, 2, 5, 7, 10, 14, 20, 30, 50, 60, 100, 200] as const

/** Escala Y en días desde 0, con aire para el rótulo y ≤ 5 divisiones. */
export function resolucionScale(values: ReadonlyArray<number | null>): { max: number; interval: number } {
  const peak = Math.max(0, ...values.map((v) => v ?? 0))
  const raw = Math.max(1, peak * 1.25)
  const interval = SCALE_STEPS.find((step) => Math.ceil(raw / step) <= 5) ?? Math.ceil(raw / 5)
  return { max: Math.ceil(raw / interval) * interval, interval }
}

/** Rotulados: el último punto con dato y el máximo (el resto, en tooltip). */
export function resolucionLabeledIndexes(values: ReadonlyArray<number | null>): Set<number> {
  const known = values.flatMap((value, index) => (value === null ? [] : [index]))
  const labeled = new Set<number>()
  if (known.length === 0) return labeled
  labeled.add(known[known.length - 1])
  let peak = known[0]
  for (const index of known) if ((values[index] ?? 0) > (values[peak] ?? 0)) peak = index
  labeled.add(peak)
  return labeled
}

/**
 * TIEMPO DE RESOLUCIÓN: línea de la MEDIANA por bucket. Tramos rectos,
 * connectNulls=false (un bucket sin cierres corta la línea: no hay
 * continuidad observada), eje Y en días desde 0, futuros sin dibujar.
 * Punto lleno con n ≥ 3; hueco y discontinuo con n < 3 («pocos cierres»).
 */
export function buildResolucionTrendOption(
  flowBuckets: readonly OperationalKpiFlowBucket[],
  resolution: Pick<OperationalKpiResolution, 'buckets'>,
  level: FlujoLevel,
): EChartsCoreOption {
  const font = DEFAULT_NOVEX_CHART_TOKENS.fontFamily
  const medians = resolution.buckets.map((b) => b.medianDays)
  const scale = resolucionScale(medians)
  const labeled = resolucionLabeledIndexes(medians)
  const tokens = NOVEX_RESOLUTION_TOKENS

  return {
    animationDurationUpdate: 220,
    animationEasingUpdate: 'cubicOut',
    grid: { ...NOVEX_SAFE_GRID, top: 22, bottom: 6 },
    xAxis: temporalAxes(flowBuckets, level),
    yAxis: {
      type: 'value',
      min: 0,
      max: scale.max,
      interval: scale.interval,
      name: 'días',
      nameLocation: 'end',
      nameGap: 8,
      nameTextStyle: { color: 'rgb(35 25 16 / 0.5)', fontSize: 9, fontWeight: 700, align: 'left' },
      axisLabel: {
        color: 'rgb(35 25 16 / 0.5)',
        fontSize: 9.5,
        fontWeight: 700,
        formatter: (value: number) => formatResolutionAxisDays(value),
      },
      splitLine: { lineStyle: { color: 'rgb(35 25 16 / 0.09)', type: 'dashed' } },
    },
    tooltip: {
      trigger: 'item',
      confine: true,
      formatter: (params: unknown) => {
        const item = params as { dataIndex?: number }
        const index = item.dataIndex ?? -1
        const flow = flowBuckets[index]
        const bucket = resolution.buckets[index]
        if (!flow || !bucket || bucket.closedCount === null) return ''
        return resolucionTooltipHtml(flujoBucketTitle(flow, level), bucket)
      },
    },
    series: [
      bandSeries(flowBuckets, scale.max),
      {
        type: 'line',
        name: 'Mediana',
        z: 3,
        animation: false,
        smooth: false,
        connectNulls: false,
        symbol: 'circle',
        symbolSize: 8,
        showAllSymbol: true,
        lineStyle: { color: tokens.line, width: 2.2 },
        itemStyle: { color: tokens.line, borderColor: tokens.paper, borderWidth: 1.6 },
        emphasis: { focus: 'none', scale: 1.4 },
        data: resolution.buckets.map((bucket, index) => {
          if (bucket.medianDays === null) return null
          const lowN = (bucket.closedCount ?? 0) < RESOLUTION_LOW_N
          return {
            value: bucket.medianDays,
            ...(lowN
              ? {
                  symbolSize: 8,
                  itemStyle: {
                    color: tokens.paper,
                    borderColor: tokens.lowN,
                    borderWidth: 1.8,
                    borderType: 'dashed' as const,
                  },
                }
              : {}),
            label: {
              show: labeled.has(index),
              position: 'top' as const,
              distance: 7,
              fontSize: 10.5,
              fontWeight: 800,
              color: tokens.label,
              fontFamily: font,
              formatter: () => formatResolutionDuration(bucket.medianDays ?? 0),
            },
          }
        }),
      },
    ],
  }
}

/** Tooltip de un rango: «3–7 DÍAS · 7 problemas solucionados · 35 % de los cierres». */
export function tiempoSolucionTooltipLines(
  bandIndex: number,
  resolution: Pick<OperationalKpiResolution, 'closedCount' | 'distribution'>,
): [string, string, string] {
  const meta = RESOLUTION_BANDS[bandIndex]
  const count = resolutionBandCounts(resolution)[bandIndex] ?? 0
  return [
    meta.label.toUpperCase(),
    `${count} ${count === 1 ? 'problema solucionado' : 'problemas solucionados'}`,
    `${resolutionBandPercent(count, resolution.closedCount)} % de los cierres`,
  ]
}

const DIST_STEPS = [1, 2, 5, 10, 20, 25, 50, 100, 200, 500] as const

function tiempoSolucionAxis(maxCount: number): { max: number; interval: number } {
  const target = Math.max(1, maxCount * 1.15)
  const interval = DIST_STEPS.find((step) => Math.ceil(target / step) <= 4) ?? 1000
  return { max: Math.max(interval * 2, Math.ceil(target / interval) * interval), interval }
}

/**
 * TIEMPO HASTA SOLUCIÓN: los seis rangos (< 1 día arriba, 30+ abajo) como
 * barras horizontales con su conteo al final. Tono = duración (escala propia,
 * no la de Antigüedad). Informativa: sin click ni filtro, sin SLA.
 */
export function buildTiempoSolucionOption(
  resolution: Pick<OperationalKpiResolution, 'closedCount' | 'distribution'>,
): EChartsCoreOption {
  const counts = resolutionBandCounts(resolution)
  const font = DEFAULT_NOVEX_CHART_TOKENS.fontFamily
  const { max, interval } = tiempoSolucionAxis(Math.max(0, ...counts))
  const tokens = NOVEX_RESOLUTION_TOKENS

  return {
    animationDuration: 320,
    animationEasing: 'cubicOut',
    grid: { left: 4, right: 30, top: 12, bottom: 30, containLabel: true },
    yAxis: {
      type: 'category',
      inverse: true,
      data: RESOLUTION_BANDS.map((meta) => meta.label),
      axisTick: { show: false },
      axisLine: { show: true, lineStyle: { color: tokens.border, width: 1.4 } },
      axisLabel: { color: DEFAULT_NOVEX_CHART_TOKENS.ink, fontSize: 11, fontWeight: 700, fontFamily: font, margin: 8 },
      splitLine: { show: false },
    },
    xAxis: {
      type: 'value',
      min: 0,
      max,
      interval,
      name: 'problemas solucionados',
      nameLocation: 'middle',
      nameGap: 18,
      nameTextStyle: { color: 'rgb(35 25 16 / 0.45)', fontSize: 9, fontWeight: 700 },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: 'rgb(35 25 16 / 0.45)',
        fontSize: 9,
        fontWeight: 700,
        formatter: (value: number) => String(Math.round(value)),
      },
      splitLine: { lineStyle: { color: 'rgb(35 25 16 / 0.09)', width: 1, type: 'dashed' } },
    },
    series: [
      {
        type: 'bar',
        name: 'Problemas solucionados',
        data: counts.map((value, index) => ({
          value,
          itemStyle: {
            color: resolutionBandColor(index),
            borderColor: tokens.border,
            borderWidth: value === 0 ? 0 : 1.1,
            borderRadius: [2, 6, 6, 2],
          },
        })),
        barMaxWidth: 18,
        barCategoryGap: '42%',
        label: {
          show: true,
          position: 'right',
          distance: 6,
          formatter: (params: { value?: number }) => String(params.value ?? 0),
          color: tokens.label,
          fontSize: 12,
          fontWeight: 800,
          fontFamily: font,
        },
        emphasis: { itemStyle: { borderWidth: 1.6 } },
      },
    ],
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow', shadowStyle: { color: 'rgb(35 25 16 / 0.06)' } },
      confine: true,
      formatter: (params: unknown) => {
        const list = Array.isArray(params) ? params : [params]
        const first = list[0] as { dataIndex?: number } | undefined
        const index = first?.dataIndex ?? -1
        if (index < 0 || index >= RESOLUTION_BANDS.length) return ''
        const [title, count, percent] = tiempoSolucionTooltipLines(index, resolution)
        return [
          `<div style="font-weight:800;margin-bottom:4px;letter-spacing:.04em">${escapeHtml(title)}</div>`,
          `<div style="font-weight:800">${escapeHtml(count)}</div>`,
          `<div>${escapeHtml(percent)}</div>`,
        ].join('')
      },
    },
  }
}
