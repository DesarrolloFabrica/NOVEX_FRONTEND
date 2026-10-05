import type { EChartsCoreOption } from 'echarts/core'

/**
 * Tokens visuales compartidos para gráficas DIRECTOR (papel + tinta + acento).
 * No es un tema SaaS: conserva tipografía de ticket e irregularidad controlada.
 */
export interface NovexChartThemeTokens {
  ink: string
  paper: string
  accent: string
  secondary: string
  muted: string
  grid: string
  tooltipBorder: string
  tooltipBg: string
  areaTop: string
  areaBottom: string
  barRadius: number
  lineWidth: number
  fontFamily: string
}

export const DEFAULT_NOVEX_CHART_TOKENS: NovexChartThemeTokens = {
  ink: '#231910',
  paper: 'transparent',
  accent: 'var(--ticket-accent, #2a2118)',
  secondary: 'rgb(35 25 16 / 0.28)',
  muted: 'rgb(35 25 16 / 0.55)',
  grid: 'rgb(35 25 16 / 0.1)',
  tooltipBorder: 'rgb(35 25 16 / 0.4)',
  tooltipBg: 'rgb(250 244 232 / 0.98)',
  areaTop: 'rgb(42 33 24 / 0.28)',
  areaBottom: 'rgb(42 33 24 / 0.02)',
  barRadius: 7,
  lineWidth: 3.4,
  fontFamily: "Georgia, 'Times New Roman', Times, serif",
}

export function resolveAccent(tokens: NovexChartThemeTokens = DEFAULT_NOVEX_CHART_TOKENS): string {
  if (typeof window === 'undefined') return '#2a2118'
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue('--ticket-accent')
    .trim()
  if (raw) return raw
  return tokens.accent.startsWith('var(') ? '#2a2118' : tokens.accent
}

/** Convierte #rgb/#rrggbb a rgba con alpha. */
export function inkAlpha(hexOrCss: string, alpha: number): string {
  const hex = hexOrCss.trim()
  const short = /^#([0-9a-f]{3})$/i.exec(hex)
  const full = /^#([0-9a-f]{6})$/i.exec(hex)
  if (short) {
    const [r, g, b] = short[1].split('').map((c) => parseInt(c + c, 16))
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }
  if (full) {
    const n = full[1]
    const r = parseInt(n.slice(0, 2), 16)
    const g = parseInt(n.slice(2, 4), 16)
    const b = parseInt(n.slice(4, 6), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }
  return `rgb(35 25 16 / ${alpha})`
}

export function novexAreaGradient(accent: string) {
  return {
    type: 'linear' as const,
    x: 0,
    y: 0,
    x2: 0,
    y2: 1,
    colorStops: [
      { offset: 0, color: inkAlpha(accent, 0.3) },
      { offset: 0.55, color: inkAlpha(accent, 0.1) },
      { offset: 1, color: inkAlpha(accent, 0.015) },
    ],
  }
}

export const NOVEX_SAFE_GRID = {
  left: 16,
  right: 20,
  top: 32,
  bottom: 16,
  containLabel: true,
} as const

export function buildNovexTooltipBase(
  tokens: NovexChartThemeTokens,
): NonNullable<EChartsCoreOption['tooltip']> {
  return {
    trigger: 'axis',
    backgroundColor: tokens.tooltipBg,
    borderColor: tokens.tooltipBorder,
    borderWidth: 2,
    padding: [8, 10],
    textStyle: {
      color: tokens.ink,
      fontFamily: tokens.fontFamily,
      fontSize: 12,
      fontWeight: 600,
    },
    extraCssText:
      'box-shadow: 3px 3px 0 rgb(35 25 16 / 0.14); border-radius: 2px; letter-spacing: 0.01em;',
    axisPointer: {
      type: 'line',
      lineStyle: {
        color: tokens.ink,
        width: 1.2,
        type: 'dashed',
        opacity: 0.35,
      },
    },
  }
}

export function buildNovexChartBaseOption(
  overrides?: Partial<NovexChartThemeTokens>,
): EChartsCoreOption {
  const tokens = { ...DEFAULT_NOVEX_CHART_TOKENS, ...overrides }
  const accent = resolveAccent(tokens)

  return {
    backgroundColor: tokens.paper,
    color: [accent, tokens.secondary],
    textStyle: {
      fontFamily: tokens.fontFamily,
      color: tokens.ink,
    },
    animationDuration: 260,
    animationEasing: 'cubicOut',
    grid: { ...NOVEX_SAFE_GRID },
    tooltip: buildNovexTooltipBase(tokens),
    xAxis: {
      type: 'category',
      axisLine: { lineStyle: { color: tokens.ink, width: 1.6 } },
      axisTick: { show: false },
      axisLabel: {
        color: tokens.muted,
        fontSize: 10,
        fontWeight: 700,
        margin: 12,
        fontFamily: tokens.fontFamily,
      },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      splitNumber: 4,
      axisLine: { show: true, lineStyle: { color: tokens.ink, width: 1.3 } },
      axisTick: { show: false },
      axisLabel: {
        color: tokens.muted,
        fontSize: 10,
        fontWeight: 700,
        fontFamily: tokens.fontFamily,
        formatter: (value: number) => String(Math.round(value)),
      },
      splitLine: {
        lineStyle: { color: tokens.grid, width: 1, type: 'dashed' },
      },
    },
  }
}

/** Merge superficial de ejes/grid/tooltip para no perder el tema base. */
export function mergeNovexChartOption(
  base: EChartsCoreOption,
  override: EChartsCoreOption,
): EChartsCoreOption {
  const mergeAxis = (
    a: EChartsCoreOption['xAxis'],
    b: EChartsCoreOption['xAxis'],
  ) => {
    if (Array.isArray(a) || Array.isArray(b)) return b ?? a
    return { ...(a as object), ...(b as object) }
  }

  const grid =
    override.grid === undefined
      ? base.grid
      : {
          ...(base.grid as object),
          ...(override.grid as object),
        }

  return {
    ...base,
    ...override,
    grid,
    title: override.title
      ? { ...(base.title as object), ...(override.title as object) }
      : base.title,
    tooltip: {
      ...(base.tooltip as object),
      ...(override.tooltip as object),
    },
    legend: override.legend
      ? { ...(base.legend as object), ...(override.legend as object) }
      : base.legend,
    xAxis: mergeAxis(base.xAxis, override.xAxis),
    yAxis: mergeAxis(base.yAxis, override.yAxis),
  }
}

export function novexAccentColor(): string {
  return resolveAccent(DEFAULT_NOVEX_CHART_TOKENS)
}
