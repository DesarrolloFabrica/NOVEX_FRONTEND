// Capa: motor auxiliar — narrativa ejecutiva determinista (sin IA).
// Construye un párrafo a partir de agregados ya calculados.

import { resolveDominantImpactDimension } from '@/modules/operational-events/engine/aggregations'
import type {
  DashboardMetrics,
  OperationalTrend,
  RiskLevel,
} from '@/modules/operational-events/types/operational-event.types'

type ImpactDimension = ReturnType<typeof resolveDominantImpactDimension>

const RISK_LABEL: Record<RiskLevel, string> = {
  low: 'bajo',
  moderate: 'moderado',
  high: 'alto',
  critical: 'crítico',
}

const TREND_LABEL: Record<OperationalTrend, string> = {
  improving: 'de mejora',
  stable: 'estable',
  deteriorating: 'de deterioro',
  insufficient_data: 'aún no concluyente por escasez de datos',
}

const IMPACT_LABEL: Record<ImpactDimension, string> = {
  internal: 'procesos internos',
  external: 'actores externos',
  students: 'procesos académicos y estudiantes',
  balanced: 'múltiples frentes (interno, externo y estudiantil)',
}

type NarrativeInput = Pick<
  DashboardMetrics,
  | 'totalEvents'
  | 'openCount'
  | 'criticalCount'
  | 'averageRiskScore'
  | 'operationalRiskLevel'
  | 'trend'
  | 'dominantAreaName'
  | 'dominantCategoryName'
  | 'averageImpactInternal'
  | 'averageImpactExternal'
  | 'averageImpactStudents'
>

/**
 * Genera la narrativa ejecutiva del tablero con reglas fijas.
 * No invoca modelos de lenguaje.
 */
export function buildExecutiveNarrative(input: NarrativeInput): string {
  if (input.totalEvents === 0) {
    return 'No hay eventos operacionales registrados en este periodo. El tablero permanece en espera de nueva información.'
  }

  const dominantArea = input.dominantAreaName ?? 'varias áreas operativas'
  const dominantCategory = input.dominantCategoryName ?? 'diversas categorías'
  const impactDimension = resolveDominantImpactDimension({
    averageImpactInternal: input.averageImpactInternal,
    averageImpactExternal: input.averageImpactExternal,
    averageImpactStudents: input.averageImpactStudents,
  })
  const impactLabel = IMPACT_LABEL[impactDimension]
  const riskLabel = RISK_LABEL[input.operationalRiskLevel]
  const trendLabel = TREND_LABEL[input.trend]

  const criticalClause =
    input.criticalCount > 0
      ? ` Se identifican ${input.criticalCount} evento${input.criticalCount === 1 ? '' : 's'} crítico${input.criticalCount === 1 ? '' : 's'} activo${input.criticalCount === 1 ? '' : 's'} que requieren atención prioritaria.`
      : ' No se registran eventos críticos activos en el recorte actual.'

  return (
    `Durante este periodo la mayor concentración de incidentes corresponde al área ${dominantArea}` +
    ` (${input.openCount} evento${input.openCount === 1 ? '' : 's'} activo${input.openCount === 1 ? '' : 's'}),` +
    ` con categoría predominante «${dominantCategory}»` +
    ` y un impacto predominante sobre ${impactLabel}.` +
    ` El nivel de riesgo operacional es ${riskLabel} (índice ${input.averageRiskScore}).` +
    ` La tendencia general se estima ${trendLabel}.` +
    criticalClause
  )
}
