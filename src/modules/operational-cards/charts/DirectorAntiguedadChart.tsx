import { useEffect, useMemo, useRef, useState } from 'react'
import { NovexEChart } from '@/modules/operational-cards/charts/NovexChart'
import {
  AGING_BANDS,
  agingBandPercent,
  buildAntiguedadOption,
  buildDistribucionOption,
  formatAgeLabel,
} from '@/modules/operational-cards/charts/antiguedad-option'
import type { OperationalKpiAging } from '@/modules/operational-cards/types/operational-kpi.types'

/** Alto mínimo por fila (título + barra) si el marco no impone altura. */
const ROW_HEIGHT = 44
const CHART_PADDING = 40

/**
 * Ranking de ANTIGÜEDAD. Mide su ancho para abreviar los títulos por píxeles
 * (el título va encima de la barra, no en el eje).
 */
export function AntiguedadChart({ aging }: { aging: OperationalKpiAging }) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [width, setWidth] = useState(360)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const read = () => {
      const next = Math.round(host.clientWidth)
      if (next >= 80) setWidth((prev) => (Math.abs(prev - next) >= 4 ? next : prev))
    }
    read()
    const observer = new ResizeObserver(read)
    observer.observe(host)
    return () => observer.disconnect()
  }, [])

  const option = useMemo(
    () => buildAntiguedadOption(aging, { chartWidth: width }),
    [aging, width],
  )
  const height = Math.max(1, aging.oldest.length) * ROW_HEIGHT + CHART_PADDING
  const aria = `Problemas más antiguos: ${aging.oldest
    .map((item) => `${item.title}, ${formatAgeLabel(item.ageDays)}`)
    .join('; ')}.`

  return (
    <div ref={hostRef} className="director-antiguedad__measure">
      <NovexEChart
        option={option}
        ariaLabel={aria}
        height={height}
        testId="director-antiguedad-chart"
        className="director-antiguedad__chart"
      />
    </div>
  )
}

/** ANTIGÜEDAD DE LA CARGA: distribución de `aging.bands` (mismo corte). */
export function DistribucionChart({ aging }: { aging: OperationalKpiAging }) {
  const option = useMemo(() => buildDistribucionOption(aging), [aging])
  const aria = `Antigüedad de la carga: ${AGING_BANDS.map((meta) => {
    const count = aging.bands.find((band) => band.key === meta.key)?.count ?? 0
    return `${meta.label}, ${count} (${agingBandPercent(count, aging.activeCount)} %)`
  }).join('; ')}.`

  return (
    <div className="director-antiguedad__measure">
      <NovexEChart
        option={option}
        ariaLabel={aria}
        height={4 * ROW_HEIGHT + CHART_PADDING}
        testId="director-distribucion-chart"
        className="director-antiguedad__chart"
      />
    </div>
  )
}
