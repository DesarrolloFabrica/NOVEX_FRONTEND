import { useEffect, useRef } from 'react'
import type { EChartsCoreOption, EChartsType } from 'echarts/core'
import { init, use as echartsUse } from 'echarts/core'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  MarkPointComponent,
  TitleComponent,
} from 'echarts/components'
import { SVGRenderer } from 'echarts/renderers'
import {
  buildNovexChartBaseOption,
  mergeNovexChartOption,
  type NovexChartThemeTokens,
} from '@/modules/operational-cards/charts/novex-chart-theme'

echartsUse([
  LineChart,
  BarChart,
  PieChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  MarkPointComponent,
  TitleComponent,
  SVGRenderer,
])

export type NovexChartOption = EChartsCoreOption

/**
 * Interacción por banda de categoría (eje X): toda la columna de la categoría
 * es el objetivo de hover/click, no solo la barra.
 */
export type NovexChartCategoryInteraction = {
  isClickable: (index: number) => boolean
  onClick: (index: number) => void
  /** Categoría bajo el puntero (null al salir): hover coordinado entre gráficas. */
  onHover?: (index: number | null) => void
}

/**
 * Contenedor ECharts (SVG) con tema NOVEX.
 * Alias exportado también como NovexEChart.
 */
export function NovexChart({
  option,
  className,
  testId = 'novex-chart',
  ariaLabel,
  height = 140,
  tokens,
  categoryInteraction,
  highlightIndex = null,
}: {
  option: NovexChartOption
  className?: string
  testId?: string
  ariaLabel: string
  height?: number
  tokens?: Partial<NovexChartThemeTokens>
  categoryInteraction?: NovexChartCategoryInteraction
  /**
   * Banda resaltada desde fuera (hover de otra gráfica sincronizada).
   * Resalta la columna en todas las series (banda + punto / barras).
   */
  highlightIndex?: number | null
}) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<EChartsType | null>(null)
  const optionRef = useRef(option)
  const tokensRef = useRef(tokens)
  const interactionRef = useRef(categoryInteraction)
  optionRef.current = option
  tokensRef.current = tokens
  interactionRef.current = categoryInteraction

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let disposed = false
    let chart: EChartsType | null = null

    const resolveHeight = () => {
      const fromHost = host.clientHeight
      if (fromHost >= 40) return fromHost
      return height
    }

    const paint = () => {
      if (disposed) return
      const w = host.clientWidth
      const h = resolveHeight()
      if (w < 8 || h < 8) return

      if (!chart) {
        chart = init(host, undefined, {
          renderer: 'svg',
          height: h,
          width: w,
        })
        chartRef.current = chart
        bindCategoryInteraction(chart, () => interactionRef.current)
      }
      const merged = mergeNovexChartOption(
        buildNovexChartBaseOption(tokensRef.current),
        optionRef.current,
      )
      chart.setOption(merged, { notMerge: true })
      chart.resize({ width: w, height: h })
    }

    paint()
    const frame = window.requestAnimationFrame(paint)
    const observer = new ResizeObserver(() => {
      paint()
    })
    observer.observe(host)

    return () => {
      disposed = true
      window.cancelAnimationFrame(frame)
      observer.disconnect()
      chart?.dispose()
      chart = null
      chartRef.current = null
    }
  }, [height])

  useEffect(() => {
    const chart = chartRef.current
    const host = hostRef.current
    if (!chart || !host || host.clientWidth < 8) return
    const h = host.clientHeight >= 40 ? host.clientHeight : height
    const merged = mergeNovexChartOption(
      buildNovexChartBaseOption(tokens),
      option,
    )
    chart.setOption(merged, { notMerge: true })
    chart.resize({ width: host.clientWidth, height: h })
  }, [option, tokens, height])

  // Solo se toca la columna que cambia: un downplay global durante la
  // animación de entrada congelaría los símbolos de una línea en escala 0.
  const highlightedRef = useRef<number | null>(null)
  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return
    const previous = highlightedRef.current
    if (previous === highlightIndex) return
    if (previous !== null) chart.dispatchAction({ type: 'downplay', dataIndex: previous })
    if (highlightIndex !== null) {
      chart.dispatchAction({ type: 'highlight', dataIndex: highlightIndex })
    }
    highlightedRef.current = highlightIndex
  }, [highlightIndex])

  return (
    <div
      className={className ? `novex-chart ${className}` : 'novex-chart'}
      data-testid={testId}
      role="img"
      aria-label={ariaLabel}
    >
      <div
        ref={hostRef}
        className="novex-chart__canvas"
        style={{ height: '100%', width: '100%', minHeight: height }}
      />
    </div>
  )
}

/** Índice de categoría bajo el puntero, o null fuera del grid. */
function categoryIndexAt(chart: EChartsType, x: number, y: number): number | null {
  if (!chart.containPixel({ gridIndex: 0 }, [x, y])) return null
  const point = chart.convertFromPixel({ gridIndex: 0 }, [x, y]) as
    | number[]
    | number
  const raw = Array.isArray(point) ? point[0] : point
  return typeof raw === 'number' && Number.isFinite(raw) ? Math.round(raw) : null
}

function bindCategoryInteraction(
  chart: EChartsType,
  read: () => NovexChartCategoryInteraction | undefined,
) {
  const zr = chart.getZr()
  let hovered: number | null = null
  const emitHover = (index: number | null) => {
    if (index === hovered) return
    hovered = index
    read()?.onHover?.(index)
  }
  zr.on('mousemove', (event) => {
    const interaction = read()
    if (!interaction) return
    const index = categoryIndexAt(chart, event.offsetX, event.offsetY)
    zr.setCursorStyle(
      index !== null && interaction.isClickable(index) ? 'pointer' : 'default',
    )
    emitHover(index)
  })
  zr.on('globalout', () => emitHover(null))
  // Click = mousedown + mouseup sobre la MISMA categoría. No se usa el
  // «click» del DOM: con el puntero de banda activo, el renderer SVG repinta el
  // path entre down y up, el nodo original desaparece y el navegador no emite
  // click (le pasaría a cualquier usuario que pasa el ratón antes de hacer click).
  let pressedIndex: number | null = null
  zr.on('mousedown', (event) => {
    pressedIndex = categoryIndexAt(chart, event.offsetX, event.offsetY)
  })
  zr.on('mouseup', (event) => {
    const interaction = read()
    const pressed = pressedIndex
    pressedIndex = null
    if (!interaction || pressed === null) return
    const index = categoryIndexAt(chart, event.offsetX, event.offsetY)
    if (index === pressed && interaction.isClickable(index)) {
      interaction.onClick(index)
    }
  })
}

/** Nombre canónico del ticket de diseño. */
export const NovexEChart = NovexChart
