import { useMemo } from 'react'
import { NovexEChart } from '@/modules/operational-cards/charts/NovexChart'
import { FLUJO_CHART_HEIGHT, flujoBucketTitle, type FlujoLevel } from '@/modules/operational-cards/charts/flujo-option'
import {
  RESOLUTION_BANDS,
  buildResolucionTrendOption,
  buildTiempoSolucionOption,
  formatResolutionDuration,
  resolutionBandCounts,
  resolutionBandPercent,
} from '@/modules/operational-cards/charts/resolucion-option'
import type {
  OperationalKpiFlowBucket,
  OperationalKpiResolution,
} from '@/modules/operational-cards/types/operational-kpi.types'

/** TIEMPO DE RESOLUCIÓN: mediana por bucket, mismo eje temporal que Carga. */
export function ResolucionTrendChart({
  flowBuckets,
  resolution,
  level,
}: {
  flowBuckets: readonly OperationalKpiFlowBucket[]
  resolution: OperationalKpiResolution
  level: FlujoLevel
}) {
  const option = useMemo(
    () => buildResolucionTrendOption(flowBuckets, resolution, level),
    [flowBuckets, resolution, level],
  )
  const aria = `Tiempo de resolución (mediana): ${resolution.buckets
    .map((bucket, index) => {
      const flow = flowBuckets[index]
      if (!flow || bucket.closedCount === null) return null
      const title = flujoBucketTitle(flow, level)
      return bucket.medianDays === null
        ? `${title}, sin cierres`
        : `${title}, ${formatResolutionDuration(bucket.medianDays, { long: true })} con ${bucket.closedCount} ${bucket.closedCount === 1 ? 'cierre' : 'cierres'}`
    })
    .filter(Boolean)
    .join('; ')}.`

  return (
    <div className="director-resolucion__measure">
      <NovexEChart
        option={option}
        ariaLabel={aria}
        height={FLUJO_CHART_HEIGHT}
        testId="director-resolucion-trend-chart"
        className="director-resolucion__chart"
      />
    </div>
  )
}

/** TIEMPO HASTA SOLUCIÓN: cierres del periodo por rango de duración. */
export function TiempoSolucionChart({ resolution }: { resolution: OperationalKpiResolution }) {
  const option = useMemo(() => buildTiempoSolucionOption(resolution), [resolution])
  const counts = resolutionBandCounts(resolution)
  const aria = `Tiempo hasta solución: ${RESOLUTION_BANDS.map(
    (meta, index) =>
      `${meta.label}, ${counts[index]} (${resolutionBandPercent(counts[index], resolution.closedCount)} %)`,
  ).join('; ')}.`

  return (
    <div className="director-resolucion__measure">
      <NovexEChart
        option={option}
        ariaLabel={aria}
        height={FLUJO_CHART_HEIGHT}
        testId="director-tiempo-solucion-chart"
        className="director-resolucion__chart"
      />
    </div>
  )
}
