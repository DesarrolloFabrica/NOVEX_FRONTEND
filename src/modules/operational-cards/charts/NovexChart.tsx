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
}: {
  option: NovexChartOption
  className?: string
  testId?: string
  ariaLabel: string
  height?: number
  tokens?: Partial<NovexChartThemeTokens>
}) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<EChartsType | null>(null)
  const optionRef = useRef(option)
  const tokensRef = useRef(tokens)
  optionRef.current = option
  tokensRef.current = tokens

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

/** Nombre canónico del ticket de diseño. */
export const NovexEChart = NovexChart
