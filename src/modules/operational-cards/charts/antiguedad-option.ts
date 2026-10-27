import type { EChartsCoreOption } from 'echarts/core'
import {
  DEFAULT_NOVEX_CHART_TOKENS,
  inkAlpha,
  NOVEX_AGING_TOKENS,
} from '@/modules/operational-cards/charts/novex-chart-theme'
import type {
  OperationalKpiAging,
  OperationalKpiAgingBandKey,
  OperationalKpiAgingItem,
} from '@/modules/operational-cards/types/operational-kpi.types'

/**
 * ANTIGÜEDAD · PROBLEMAS MÁS ANTIGUOS: barras horizontales (eje Y =
 * problemas, eje X = días). Arriba el más antiguo. La edad (`ageDays`) llega
 * calculada del backend en días Bogotá: aquí solo se presenta.
 */

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

const SEVERITY_LABEL: Record<OperationalKpiAgingItem['severity'], string> = {
  CRITICAL: 'CRÍTICA',
  HIGH: 'ALTA',
  MEDIUM: 'MEDIA',
  LOW: 'BAJA',
}

const STATUS_LABEL: Record<NonNullable<OperationalKpiAgingItem['status']>, string> = {
  OPEN: 'Abierto',
  IN_PROGRESS: 'En atención',
}

/** Etiqueta de la barra: 0 → HOY, n → «n d». */
export function formatAgeLabel(ageDays: number): string {
  return ageDays === 0 ? 'HOY' : `${ageDays} d`
}

/** Edad en prosa para el tooltip. */
function formatAgeLong(ageDays: number): string {
  if (ageDays === 0) return 'Registrado hoy'
  return ageDays === 1 ? '1 día' : `${ageDays} días`
}

function bogotaParts(iso: string): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(iso))
  const read = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  return { year: read('year'), month: read('month'), day: read('day') }
}

/** «25 ago 2026» (fecha local Bogotá de un instante ISO). */
export function formatBogotaDate(iso: string, withYear = true): string {
  const { year, month, day } = bogotaParts(iso)
  return `${day} ${MONTH_SHORT[month - 1]}${withYear ? ` ${year}` : ''}`
}

/** Corte de la lectura: «HOY» o «AL CIERRE DEL 30 SEP 2026». */
export function formatAgingCut(aging: Pick<OperationalKpiAging, 'at' | 'isNow'>): string {
  if (aging.isNow) return 'HOY'
  const [year, month, day] = aging.at.split('-').map(Number)
  return `AL CIERRE DEL ${day} ${MONTH_SHORT[month - 1].toUpperCase()} ${year}`
}

/** «Interno · Admisiones» / «Compromiso · Bienestar». */
export function agingKindLine(item: OperationalKpiAgingItem): string {
  if (item.reportKind === 'INTERNAL') {
    return `Interno · ${item.categoryName ?? 'Sin categoría'}`
  }
  return `Compromiso · afecta a ${item.affectedCoordinationName ?? 'sin coordinación afectada'}`
}

/**
 * Activos que no entran en el ranking (null si no hay). «Fuera del Top 5» y
 * no «adicionales»: no son problemas nuevos, son el resto de la carga.
 */
export function agingRemainderText(aging: Pick<OperationalKpiAging, 'activeCount' | 'oldest'>): string | null {
  const rest = aging.activeCount - aging.oldest.length
  if (rest <= 0) return null
  return rest === 1 ? '+ 1 activo fuera del Top 5' : `+ ${rest} activos fuera del Top 5`
}

/* ───────────── Rangos de edad (contrato `aging.bands`) ───────────── */

/**
 * Rangos de Fase 1 (backend): 0–7 (≤ 7), 8–14, 15–30, 31+ (≥ 31).
 * 7 d = SLA MEDIUM, 14 d = SLA LOW. El orden es el del contrato.
 */
export const AGING_BANDS: ReadonlyArray<{
  key: OperationalKpiAgingBandKey
  label: string
  title: string
  min: number
}> = [
  { key: '0-7', label: '0–7 días', title: '0–7 DÍAS', min: 0 },
  { key: '8-14', label: '8–14 días', title: '8–14 DÍAS', min: 8 },
  { key: '15-30', label: '15–30 días', title: '15–30 DÍAS', min: 15 },
  { key: '31+', label: '31+ días', title: '31+ DÍAS', min: 31 },
]

/** Índice del rango de una edad (mismos límites que el SQL). */
export function agingBandIndex(ageDays: number): number {
  if (ageDays >= 31) return 3
  if (ageDays >= 15) return 2
  if (ageDays >= 8) return 1
  return 0
}

/** Color de tinta del rango: misma escala en ranking y distribución. */
export function agingBandColor(bandIndex: number): string {
  const alphas = NOVEX_AGING_TOKENS.bandAlphas
  const alpha = alphas[Math.min(Math.max(bandIndex, 0), alphas.length - 1)]
  return inkAlpha(NOVEX_AGING_TOKENS.ink, alpha)
}

/** Porcentaje entero de la carga activa (0 si no hay carga). */
export function agingBandPercent(count: number, activeCount: number): number {
  return activeCount > 0 ? Math.round((count / activeCount) * 100) : 0
}

/** «Mediana · 11 días» (secundaria). null si no hay activos. */
export function formatAgingMedian(median: number | null): string | null {
  if (median === null) return null
  const value = Number.isInteger(median) ? String(median) : median.toFixed(1).replace('.', ',')
  return `Mediana · ${value} ${median === 1 ? 'día' : 'días'}`
}

/** Fecha de corte para tooltips: «hoy · 6 oct 2026» / «30 sep 2026». */
function cutDateText(aging: Pick<OperationalKpiAging, 'at' | 'isNow'>): string {
  const [year, month, day] = aging.at.split('-').map(Number)
  const date = `${day} ${MONTH_SHORT[month - 1]} ${year}`
  return aging.isNow ? `hoy · ${date}` : date
}

/** Tooltip corto de un rango: sin listar problemas (eso es el ranking). */
export function distribucionTooltipLines(
  bandIndex: number,
  aging: Pick<OperationalKpiAging, 'at' | 'isNow' | 'activeCount' | 'bands'>,
): string[] {
  const meta = AGING_BANDS[bandIndex]
  const count = aging.bands.find((band) => band.key === meta.key)?.count ?? 0
  return [
    meta.title,
    `${count} ${count === 1 ? 'problema activo' : 'problemas activos'}`,
    `${agingBandPercent(count, aging.activeCount)} % de la carga`,
    `Corte: ${cutDateText(aging)}`,
  ]
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Líneas del tooltip (texto plano, testeable). Corte HOY: severidad, estado
 * y SLA vigentes. Corte histórico: severidad marcada «(actual)», «Solucionado
 * después» si aplica; nunca estado ni SLA históricos.
 */
export function agingTooltipLines(
  item: OperationalKpiAgingItem,
  aging: Pick<OperationalKpiAging, 'isNow' | 'at' | 'reliability'>,
): string[] {
  const lines = [
    item.title,
    `${formatAgeLong(item.ageDays)} · desde ${formatBogotaDate(item.createdAt)}`,
  ]
  const severity = SEVERITY_LABEL[item.severity]
  if (aging.isNow) {
    const parts = [severity]
    if (aging.reliability.status === 'current' && item.status) {
      parts.push(STATUS_LABEL[item.status])
    }
    if (aging.reliability.sla === 'current' && item.slaOverdue === true) {
      parts.push('SLA vencido')
    }
    lines.push(parts.join(' · '))
  } else {
    lines.push(`${severity} (actual)`)
    if (item.closedAfterCutAt) {
      const sameYear =
        bogotaParts(item.closedAfterCutAt).year === Number(aging.at.slice(0, 4))
      lines.push(`Solucionado después · ${formatBogotaDate(item.closedAfterCutAt, !sameYear)}`)
    }
  }
  lines.push(agingKindLine(item))
  return lines
}

export function agingTooltipHtml(
  item: OperationalKpiAgingItem,
  aging: Pick<OperationalKpiAging, 'isNow' | 'at' | 'reliability'>,
): string {
  const [title, ...rest] = agingTooltipLines(item, aging)
  return [
    `<div style="font-weight:800;margin-bottom:4px;max-width:260px;white-space:normal">${escapeHtml(title)}</div>`,
    ...rest.map(
      (line, index) =>
        `<div style="${index === 0 ? 'font-weight:800' : 'opacity:.82'}">${escapeHtml(line)}</div>`,
    ),
  ].join('')
}

/** Máximo «redondo» del eje de días, con aire para la etiqueta de valor. */
export function agingAxisMax(maxAgeDays: number): number {
  const target = Math.max(4, maxAgeDays * 1.12)
  const step = target <= 10 ? 2 : target <= 30 ? 5 : target <= 120 ? 10 : 30
  return Math.ceil(target / step) * step
}

/**
 * Cada fila = [título abreviado encima] + [barra con «43 d» al final].
 * El título va encima (no en el eje) para usar el ancho real del panel; se
 * abrevia por píxeles con `chartWidth`. Serie 0 = días (valor y tooltip);
 * serie 1 = rótulo superpuesto, transparente y sin interacción.
 */
export function buildAntiguedadOption(
  aging: Pick<OperationalKpiAging, 'oldest' | 'isNow' | 'at' | 'reliability'>,
  { chartWidth = 360 }: { chartWidth?: number } = {},
): EChartsCoreOption {
  const items = aging.oldest
  const maxAge = Math.max(0, ...items.map((item) => item.ageDays))
  const xMax = agingAxisMax(maxAge)
  const font = DEFAULT_NOVEX_CHART_TOKENS.fontFamily
  const titleWidth = Math.max(120, chartWidth - 24)

  return {
    animationDuration: 320,
    animationEasing: 'cubicOut',
    grid: { left: 2, right: 48, top: 22, bottom: 30, containLabel: false },
    yAxis: {
      type: 'category',
      // inverse: el primer ítem (el más antiguo) arriba.
      inverse: true,
      data: items.map((item) => item.title),
      axisTick: { show: false },
      axisLine: { show: true, lineStyle: { color: NOVEX_AGING_TOKENS.border, width: 1.4 } },
      axisLabel: { show: false },
      splitLine: { show: false },
    },
    xAxis: {
      type: 'value',
      min: 0,
      max: xMax,
      minInterval: 1,
      splitNumber: 4,
      name: 'días desde el registro',
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
      splitLine: {
        lineStyle: { color: 'rgb(35 25 16 / 0.09)', width: 1, type: 'dashed' },
      },
    },
    series: [
      {
        type: 'bar',
        name: 'Días desde el registro',
        data: items.map((item) => ({
          value: item.ageDays,
          itemStyle: {
            // Tono del RANGO de edad (misma escala que la distribución).
            color: agingBandColor(agingBandIndex(item.ageDays)),
            borderColor: NOVEX_AGING_TOKENS.border,
            borderWidth: 1.1,
            borderRadius: [2, 6, 6, 2],
          },
        })),
        barMaxWidth: 18,
        barCategoryGap: '58%',
        label: {
          show: true,
          position: 'right',
          distance: 6,
          formatter: (params: { value?: number }) => formatAgeLabel(params.value ?? 0),
          color: NOVEX_AGING_TOKENS.label,
          fontSize: 12,
          fontWeight: 800,
          fontFamily: font,
        },
        emphasis: { itemStyle: { borderWidth: 1.6 } },
      },
      {
        // Rótulo del problema encima de su barra (misma banda: barGap -100%).
        type: 'bar',
        name: 'Problema',
        silent: true,
        barGap: '-100%',
        barMaxWidth: 18,
        data: items.map((item) => ({ value: item.ageDays, title: item.title })),
        itemStyle: { color: 'transparent', borderWidth: 0 },
        emphasis: { disabled: true },
        tooltip: { show: false },
        label: {
          show: true,
          position: [0, -15],
          formatter: (params: { data?: { title?: string } }) => params.data?.title ?? '',
          width: titleWidth,
          overflow: 'truncate',
          ellipsis: '…',
          color: DEFAULT_NOVEX_CHART_TOKENS.ink,
          fontSize: 11,
          fontWeight: 700,
          fontFamily: font,
        },
      },
    ],
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
        shadowStyle: { color: 'rgb(35 25 16 / 0.06)' },
      },
      confine: true,
      formatter: (params: unknown) => {
        const list = Array.isArray(params) ? params : [params]
        const first = list[0] as { dataIndex?: number } | undefined
        const item = items[first?.dataIndex ?? -1]
        return item ? agingTooltipHtml(item, aging) : ''
      },
    },
  }
}

export function distribucionTooltipHtml(
  bandIndex: number,
  aging: Pick<OperationalKpiAging, 'at' | 'isNow' | 'activeCount' | 'bands'>,
): string {
  const [title, count, percent, cut] = distribucionTooltipLines(bandIndex, aging)
  return [
    `<div style="font-weight:800;margin-bottom:4px;letter-spacing:.04em">${escapeHtml(title)}</div>`,
    `<div style="font-weight:800">${escapeHtml(count)}</div>`,
    `<div>${escapeHtml(percent)}</div>`,
    `<div style="margin-top:4px;opacity:.7">${escapeHtml(cut)}</div>`,
  ].join('')
}

/**
 * Eje de la distribución: intervalo «redondo» (1, 2, 5, 10…) con a lo sumo
 * cuatro divisiones y aire para la etiqueta; el máximo es múltiplo exacto
 * del intervalo (sin marcas pegadas como «9 10»).
 */
export function distribucionAxis(maxCount: number): { max: number; interval: number } {
  const target = Math.max(1, maxCount * 1.15)
  const steps = [1, 2, 5, 10, 20, 25, 50, 100, 200, 500]
  const interval = steps.find((step) => Math.ceil(target / step) <= 4) ?? 1000
  return { max: Math.max(interval * 2, Math.ceil(target / interval) * interval), interval }
}

/**
 * ANTIGÜEDAD DE LA CARGA: los cuatro rangos de `aging.bands` como barras
 * horizontales (0–7 arriba, 31+ abajo). Tono = rango de edad; el valor va al
 * final de cada barra. Puramente informativa: sin click ni filtro.
 */
export function buildDistribucionOption(
  aging: Pick<OperationalKpiAging, 'at' | 'isNow' | 'activeCount' | 'bands'>,
): EChartsCoreOption {
  const counts = AGING_BANDS.map(
    (meta) => aging.bands.find((band) => band.key === meta.key)?.count ?? 0,
  )
  const max = Math.max(0, ...counts)
  const font = DEFAULT_NOVEX_CHART_TOKENS.fontFamily
  const { max: xMax, interval } = distribucionAxis(max)

  return {
    animationDuration: 320,
    animationEasing: 'cubicOut',
    grid: { left: 4, right: 30, top: 22, bottom: 30, containLabel: true },
    yAxis: {
      type: 'category',
      inverse: true,
      data: AGING_BANDS.map((meta) => meta.label),
      axisTick: { show: false },
      axisLine: { show: true, lineStyle: { color: NOVEX_AGING_TOKENS.border, width: 1.4 } },
      axisLabel: {
        color: DEFAULT_NOVEX_CHART_TOKENS.ink,
        fontSize: 11,
        fontWeight: 700,
        fontFamily: font,
        margin: 8,
      },
      splitLine: { show: false },
    },
    xAxis: {
      type: 'value',
      min: 0,
      max: xMax,
      interval,
      name: 'problemas activos',
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
      splitLine: {
        lineStyle: { color: 'rgb(35 25 16 / 0.09)', width: 1, type: 'dashed' },
      },
    },
    series: [
      {
        type: 'bar',
        name: 'Problemas activos',
        data: counts.map((value, index) => ({
          value,
          itemStyle: {
            color: agingBandColor(index),
            borderColor: NOVEX_AGING_TOKENS.border,
            borderWidth: 1.1,
            borderRadius: [2, 6, 6, 2],
          },
        })),
        barMaxWidth: 20,
        barCategoryGap: '46%',
        label: {
          show: true,
          position: 'right',
          distance: 6,
          formatter: (params: { value?: number }) => String(params.value ?? 0),
          color: NOVEX_AGING_TOKENS.label,
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
        return index >= 0 && index < AGING_BANDS.length ? distribucionTooltipHtml(index, aging) : ''
      },
    },
  }
}
