import { NovexEChart } from '@/modules/operational-cards/charts/NovexChart'
import type { AttentionComposition } from '@/modules/operational-cards/charts/DirectorEstadoCompositionCharts'
import {
  buildCompactAttentionDonutOption,
  buildSeverityRowsOption,
  COMPACT_DONUT_SIZE,
  SEVERITY_ROWS_HEIGHT,
  severityRowsDescription,
} from '@/modules/operational-cards/charts/estado-corte-option'
import type { OperationalKpiSeverityCounts } from '@/modules/operational-cards/types/operational-kpi.types'

/**
 * Dona compacta de Atención. Su lectura textual vive en la leyenda vecina
 * (nombre, cantidad y %), así que aquí basta un resumen accesible.
 */
export function CompactAttentionDonut({
  status,
  ariaLabel,
}: {
  status: AttentionComposition
  ariaLabel: string
}) {
  return (
    <NovexEChart
      option={buildCompactAttentionDonutOption(status)}
      ariaLabel={ariaLabel}
      testId="director-estado-attention-chart"
      height={COMPACT_DONUT_SIZE}
      className="novex-chart--attention-compact"
    />
  )
}

/**
 * Lámina 2 de ESTADO (scope coordinación) · Severidad en cuatro filas
 * horizontales, Crítica → Baja. La lectura de Dirección conserva sus barras
 * verticales (DirectorEstadoCompositionCharts).
 */
export function SeverityRowsChart({ severity }: { severity: OperationalKpiSeverityCounts }) {
  return (
    <NovexEChart
      option={buildSeverityRowsOption(severity)}
      ariaLabel={severityRowsDescription(severity)}
      testId="director-estado-severity-chart"
      height={SEVERITY_ROWS_HEIGHT}
      className="novex-chart--severity-rows"
    />
  )
}
