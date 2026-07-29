// Componente: banda de mando del tablero (estado · riesgo · dónde).
// Sprint 10: lectura en <5s — narrativa colapsada.

import type { DashboardMetrics } from '@/modules/operational-events/types/operational-event.types'
import { ENVIRONMENT_THEME } from '@/modules/monitoring/constants/monitoringTheme'
import type { EnvironmentStatus } from '@/modules/monitoring/types/monitoring.types'
import { RISK_LEVEL_LABEL } from '@/modules/operational-events/components/eventPresentation'

const TREND_SHORT: Record<DashboardMetrics['trend'], string> = {
  improving: 'Mejora',
  stable: 'Estable',
  deteriorating: 'Deterioro',
  insufficient_data: '—',
}

interface OperationalStateHeroProps {
  metrics: DashboardMetrics
}

export function OperationalStateHero({ metrics }: OperationalStateHeroProps) {
  const theme = ENVIRONMENT_THEME[metrics.environment as EnvironmentStatus]
  const where =
    metrics.dominantAreaName?.trim() ||
    metrics.byArea.find((area) => area.openCount > 0)?.areaName ||
    '—'

  return (
    <section className="novex-cmd-band" aria-labelledby="intel-state-heading">
      <div>
        <p className="novex-section-eyebrow mb-1">Estado</p>
        <p className="novex-section-hint mb-2">
          Muestra el nivel actual de riesgo operacional.
        </p>
        <h2
          id="intel-state-heading"
          className="novex-cmd-band__status flex items-center gap-3"
        >
          <span
            className={`h-3 w-3 shrink-0 rounded-full ${theme.dot}`}
            aria-hidden="true"
          />
          {theme.label}
        </h2>
      </div>

      <div className="novex-cmd-band__risk">
        <p className="novex-cmd-band__risk-value">{metrics.averageRiskScore}</p>
        <p className="novex-cmd-band__risk-label">
          Riesgo · {RISK_LEVEL_LABEL[metrics.operationalRiskLevel]}
        </p>
      </div>

      <dl className="novex-cmd-band__satellites" aria-label="Indicadores satélite">
        <div>
          <dd className="novex-cmd-sat__value">{metrics.criticalCount}</dd>
          <dt className="novex-cmd-sat__label">Críticos</dt>
        </div>
        <div>
          <dd className="novex-cmd-sat__value">{metrics.openCount}</dd>
          <dt className="novex-cmd-sat__label">Abiertos</dt>
        </div>
        <div>
          <dd className="novex-cmd-sat__value truncate" title={where}>
            {where}
          </dd>
          <dt className="novex-cmd-sat__label">Dónde</dt>
        </div>
      </dl>

      <details className="novex-cmd-narrative lg:col-span-3">
        <summary>Narrativa ejecutiva</summary>
        <p>{metrics.executiveNarrative}</p>
      </details>
    </section>
  )
}

export function OperationalContextStrip({
  metrics,
}: {
  metrics: DashboardMetrics
}) {
  return (
    <div className="novex-cmd-context" aria-label="Contexto operacional">
      <div className="novex-cmd-context__item">
        <span className="novex-cmd-context__value">
          {metrics.averageImpactInternal}%
        </span>
        <span className="novex-cmd-context__label">Interno</span>
      </div>
      <div className="novex-cmd-context__item">
        <span className="novex-cmd-context__value">
          {metrics.averageImpactExternal}%
        </span>
        <span className="novex-cmd-context__label">Externo</span>
      </div>
      <div className="novex-cmd-context__item">
        <span className="novex-cmd-context__value">
          {metrics.averageImpactStudents}%
        </span>
        <span className="novex-cmd-context__label">Estudiantes</span>
      </div>
      <div className="novex-cmd-context__item">
        <span className="novex-cmd-context__value">
          {TREND_SHORT[metrics.trend]}
        </span>
        <span className="novex-cmd-context__label">Tendencia</span>
      </div>
      {metrics.dominantCategoryName ? (
        <div className="novex-cmd-context__item min-w-0">
          <span
            className="novex-cmd-context__value truncate text-[0.95rem]"
            title={metrics.dominantCategoryName}
          >
            {metrics.dominantCategoryName}
          </span>
          <span className="novex-cmd-context__label">Categoría</span>
        </div>
      ) : null}
    </div>
  )
}
