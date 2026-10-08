import { useMemo } from 'react'
import {
  NovexEChart,
  type NovexChartCategoryInteraction,
} from '@/modules/operational-cards/charts/NovexChart'
import {
  buildFlujoOption,
  buildMovimientoOption,
  FLUJO_CHART_HEIGHT,
  type FlujoLevel,
} from '@/modules/operational-cards/charts/flujo-option'
import type { OperationalKpiFlowBucket } from '@/modules/operational-cards/types/operational-kpi.types'

type ChartProps = {
  buckets: readonly OperationalKpiFlowBucket[]
  level: FlujoLevel
  categoryInteraction?: NovexChartCategoryInteraction
  /** Columna resaltada desde la otra gráfica (hover sincronizado). */
  highlightIndex?: number | null
}

const unitOf = (level: FlujoLevel) =>
  level === 'month' ? 'meses' : level === 'week' ? 'semanas' : 'días'

/** CARGA DE PROBLEMAS: activos al cierre (internos + externos) y solucionados. */
export function FlujoChart({ buckets, level, categoryInteraction, highlightIndex }: ChartProps) {
  const option = useMemo(() => buildFlujoOption(buckets, level), [buckets, level])
  const known = buckets.filter((b) => b.active)
  const last = known.at(-1)
  const solvedTotal = known.reduce((sum, b) => sum + (b.solved?.total ?? 0), 0)
  const aria = last?.active
    ? `Carga de problemas por ${unitOf(level)}. Último bucket: ${last.active.total} activos (${last.active.internal} internos, ${last.active.external} externos). ${solvedTotal} solucionados en el periodo.`
    : `Carga de problemas por ${unitOf(level)}: sin datos todavía.`
  return (
    <NovexEChart
      option={option}
      ariaLabel={aria}
      testId="director-flujo-chart"
      height={FLUJO_CHART_HEIGHT}
      categoryInteraction={categoryInteraction}
      highlightIndex={highlightIndex}
    />
  )
}

/** MOVIMIENTO DE PROBLEMAS: reportados vs solucionados durante cada bucket. */
export function MovimientoChart({
  buckets,
  level,
  categoryInteraction,
  highlightIndex,
}: ChartProps) {
  const option = useMemo(() => buildMovimientoOption(buckets, level), [buckets, level])
  const known = buckets.filter((b) => !b.future && b.solved)
  const reported = known.reduce((sum, b) => sum + (b.created ?? 0), 0)
  const solved = known.reduce((sum, b) => sum + (b.solved?.total ?? 0), 0)
  const aria =
    known.length > 0
      ? `Movimiento de problemas por ${unitOf(level)}: ${reported} reportados y ${solved} solucionados en el periodo.`
      : `Movimiento de problemas por ${unitOf(level)}: sin datos todavía.`
  return (
    <NovexEChart
      option={option}
      ariaLabel={aria}
      testId="director-movimiento-chart"
      height={FLUJO_CHART_HEIGHT}
      categoryInteraction={categoryInteraction}
      highlightIndex={highlightIndex}
    />
  )
}
