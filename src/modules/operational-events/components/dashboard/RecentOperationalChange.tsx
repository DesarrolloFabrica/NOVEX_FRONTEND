// Componente: señales de cambio — columna secundaria del tablero.
// Sprint 10: hechos cuantitativos; sin párrafos.

import type { DashboardMetrics } from '@/modules/operational-events/types/operational-event.types'

const TREND_WORD: Record<DashboardMetrics['trend'], string> = {
  improving: 'Mejora',
  stable: 'Estable',
  deteriorating: 'Deterioro',
  insufficient_data: 'Insuficiente',
}

interface RecentOperationalChangeProps {
  metrics: DashboardMetrics
}

export function RecentOperationalChange({
  metrics,
}: RecentOperationalChangeProps) {
  return (
    <section
      className="omega-intel-change"
      aria-labelledby="intel-change-heading"
    >
      <h3 id="intel-change-heading" className="omega-section-eyebrow mb-0">
        Contexto
      </h3>
      <p className="omega-section-hint mb-2">
        Cambios recientes del entorno operacional.
      </p>

      <ul className="omega-intel-change__facts">
        <li>
          <span>Tendencia</span>
          <strong>{TREND_WORD[metrics.trend]}</strong>
        </li>
        {metrics.dominantAreaName ? (
          <li>
            <span>Concentración</span>
            <strong className="truncate" title={metrics.dominantAreaName}>
              {metrics.dominantAreaName}
            </strong>
          </li>
        ) : null}
        {metrics.dominantCategoryName ? (
          <li>
            <span>Categoría</span>
            <strong className="truncate" title={metrics.dominantCategoryName}>
              {metrics.dominantCategoryName}
            </strong>
          </li>
        ) : null}
        <li>
          <span>Resueltos</span>
          <strong>{metrics.resolvedCount}</strong>
        </li>
        <li>
          <span>Total</span>
          <strong>{metrics.totalEvents}</strong>
        </li>
      </ul>
    </section>
  )
}
