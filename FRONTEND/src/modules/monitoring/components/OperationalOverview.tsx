import type { Area } from '@/modules/areas/types/area.types'
import type { AreaHealth } from '@/modules/monitoring/types/monitoring.types'
import { ENVIRONMENT_THEME } from '@/modules/monitoring/constants/monitoringTheme'

interface OperationalOverviewProps {
  area: Area | undefined
  health: AreaHealth
  isGlobal: boolean
}

export function OperationalOverview({
  area,
  health,
  isGlobal,
}: OperationalOverviewProps) {
  const theme = ENVIRONMENT_THEME[health.environment]

  return (
    <section className="operational-overview" aria-label="Resumen operativo">
      <div className="operational-overview__identity">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`operational-overview__pulse ${theme.dot}`} aria-hidden="true" />
          <p>Panorama operativo</p>
        </div>
        <h2>{isGlobal ? 'Vista general de operaciones' : (area?.name ?? 'Área operativa')}</h2>
        <span>{isGlobal ? 'Consolidado institucional en tiempo real' : `Área ${area?.code ?? '—'} · seguimiento en tiempo real`}</span>
      </div>

      <dl className="operational-overview__metrics">
        <div>
          <dt>Compromisos</dt>
          <dd>{health.totalCommitments}</dd>
        </div>
        <div data-tone="fulfilled">
          <dt>Cumplidos</dt>
          <dd>{health.fulfilledCount}</dd>
        </div>
        <div data-tone="pending">
          <dt>Pendientes</dt>
          <dd>{health.pendingCount}</dd>
        </div>
        <div data-tone="risk">
          <dt>Riesgo</dt>
          <dd>{Math.round(health.operationalRiskPercentage)}%</dd>
        </div>
        <div>
          <dt>Peso total</dt>
          <dd>{health.totalPossibleImpact}</dd>
        </div>
      </dl>
    </section>
  )
}
