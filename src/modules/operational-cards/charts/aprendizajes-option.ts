import type { EChartsCoreOption } from 'echarts/core'
import {
  DEFAULT_NOVEX_CHART_TOKENS,
  NOVEX_FLOW_TOKENS,
} from '@/modules/operational-cards/charts/novex-chart-theme'
import type { LearningCategory } from '@/modules/operational-cards/types/learnings.types'

/**
 * APRENDIZAJES POR CATEGORÍA (módulo puro, testeable sin DOM).
 *
 * Una sola serie de MAGNITUD: barras horizontales (los nombres del catálogo
 * son largos), un solo tono, sin leyenda, cifra directa al final de cada
 * barra. El tono es la salvia de «Solucionados»: un aprendizaje nace de un
 * cierre. No se usa el acento de coordinación, que en algunas cartas es
 * rojizo y se leería como «crítico».
 */

/** Alto por categoría y márgenes: la gráfica crece con sus filas, sin scroll propio. */
export const APRENDIZAJES_ROW_HEIGHT = 30
export const APRENDIZAJES_CHART_PADDING = 40
export const APRENDIZAJES_CHART_MIN_HEIGHT = 96

/** Nombres más largos se abrevian en el eje (completos en tooltip y aria). */
export const APRENDIZAJES_LABEL_MAX = 26

export function aprendizajesChartHeight(categoryCount: number): number {
  return Math.max(
    APRENDIZAJES_CHART_MIN_HEIGHT,
    categoryCount * APRENDIZAJES_ROW_HEIGHT + APRENDIZAJES_CHART_PADDING,
  )
}

/** Orden de la gráfica: cantidad ↓ · nombre ↑ (el backend ya lo entrega así). */
export function sortLearningCategories(
  categories: readonly LearningCategory[],
): LearningCategory[] {
  return [...categories].sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name, 'es'),
  )
}

/** Abrevia en límite de palabra cuando es posible. */
export function abbreviateCategory(name: string, max: number = APRENDIZAJES_LABEL_MAX): string {
  if (name.length <= max) return name
  const window = name.slice(0, max)
  const cut = window.lastIndexOf(' ')
  return `${(cut > max * 0.5 ? window.slice(0, cut) : window).trimEnd()}…`
}

export function aprendizajeCountLabel(count: number): string {
  return `${count} ${count === 1 ? 'aprendizaje' : 'aprendizajes'}`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Eje X con enteros y un margen para la cifra de la barra más larga. */
function countAxis(maxCount: number): { max: number; interval: number } {
  if (maxCount <= 4) return { max: Math.max(maxCount + 1, 2), interval: 1 }
  const interval = Math.max(1, Math.ceil(maxCount / 4))
  return { max: Math.ceil((maxCount * 1.15) / interval) * interval, interval }
}

export function buildAprendizajesOption(
  categories: readonly LearningCategory[],
): EChartsCoreOption {
  const sorted = sortLearningCategories(categories)
  const font = DEFAULT_NOVEX_CHART_TOKENS.fontFamily
  const ink = DEFAULT_NOVEX_CHART_TOKENS.ink
  const border = '#4f6b60'
  const { max, interval } = countAxis(Math.max(0, ...sorted.map((c) => c.count)))

  return {
    animationDuration: 320,
    animationEasing: 'cubicOut',
    grid: { left: 4, right: 34, top: 6, bottom: 6, containLabel: true },
    yAxis: {
      type: 'category',
      inverse: true,
      data: sorted.map((category) => abbreviateCategory(category.name)),
      axisTick: { show: false },
      axisLine: { show: true, lineStyle: { color: ink, width: 1.3 } },
      axisLabel: {
        color: ink,
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
      max,
      interval,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { show: false },
      splitLine: {
        lineStyle: { color: 'rgb(35 25 16 / 0.08)', width: 1, type: 'dashed' },
      },
    },
    series: [
      {
        type: 'bar',
        name: 'Aprendizajes',
        data: sorted.map((category) => ({
          value: category.count,
          itemStyle: {
            color: NOVEX_FLOW_TOKENS.resolved,
            borderColor: border,
            borderWidth: 1,
            borderRadius: [0, 4, 4, 0],
          },
        })),
        barMaxWidth: 16,
        barCategoryGap: '38%',
        label: {
          show: true,
          position: 'right',
          distance: 6,
          formatter: (params: { value?: number }) => String(params.value ?? 0),
          color: ink,
          fontSize: 12,
          fontWeight: 800,
          fontFamily: font,
        },
        emphasis: {
          itemStyle: { color: NOVEX_FLOW_TOKENS.resolvedHover, borderWidth: 1.4 },
        },
      },
    ],
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow', shadowStyle: { color: 'rgb(35 25 16 / 0.06)' } },
      confine: true,
      formatter: (params: unknown) => {
        const first = (Array.isArray(params) ? params[0] : params) as
          | { dataIndex?: number }
          | undefined
        const category = sorted[first?.dataIndex ?? -1]
        if (!category) return ''
        const historic = category.selectable ? '' : '<div style="opacity:.7">Categoría histórica</div>'
        return [
          `<div style="font-weight:800;margin-bottom:4px;letter-spacing:.02em">${escapeHtml(category.name)}</div>`,
          `<div style="font-weight:800">${escapeHtml(aprendizajeCountLabel(category.count))}</div>`,
          historic,
        ].join('')
      },
    },
  }
}

/** Lectura textual completa de la gráfica (aria-label). */
export function aprendizajesAriaLabel(categories: readonly LearningCategory[]): string {
  const sorted = sortLearningCategories(categories)
  if (sorted.length === 0) return 'Aprendizajes por categoría: sin aprendizajes en el periodo.'
  return `Aprendizajes por categoría: ${sorted
    .map((category) => `${category.name}, ${aprendizajeCountLabel(category.count)}`)
    .join('; ')}.`
}
