// Resumen de mando del Centro de Eventos (Sprint 10).
// Solo señales críticas — sin narrativa larga visible.

import type { DashboardMetrics } from '@/modules/operational-events/types/operational-event.types'
import { CRYSTAL_ZONE_SUPPORT } from '@/modules/monitoring/constants/monitoringTheme'
import { INTEL_ZONE } from '@/modules/monitoring/constants/visualHierarchy'
import { RISK_LEVEL_LABEL } from '@/modules/operational-events/components/eventPresentation'

const ENV_LABEL: Record<DashboardMetrics['environment'], string> = {
  pending: 'En espera',
  healthy: 'Estable',
  attention: 'Atención',
  critical: 'Crítico',
}

interface EventsCenterSummaryProps {
  metrics: DashboardMetrics
}

export function EventsCenterSummary({ metrics }: EventsCenterSummaryProps) {
  return (
    <aside
      className={`left-operational-panel relative flex h-full min-h-0 flex-col overflow-hidden ${INTEL_ZONE} ${CRYSTAL_ZONE_SUPPORT}`}
    >
      <div>
        <p className="omega-section-eyebrow mb-1">Resumen operacional</p>
        <p className="omega-section-hint mb-2">
          Vista rápida del riesgo y la carga actual.
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pr-1">
        <div>
          <p className="text-[1.65rem] font-semibold leading-none tracking-tight text-slate-800">
            {ENV_LABEL[metrics.environment]}
          </p>
          <p className="mt-2 text-[0.65rem] uppercase tracking-[0.14em] text-slate-500">
            {RISK_LEVEL_LABEL[metrics.operationalRiskLevel]}
          </p>
        </div>

        <div className="omega-exec-stat-grid">
          <div>
            <p className="omega-exec-stat__value">{metrics.averageRiskScore}</p>
            <p className="omega-exec-stat__label">Riesgo</p>
          </div>
          <div>
            <p className="omega-exec-stat__value">{metrics.criticalCount}</p>
            <p className="omega-exec-stat__label">Críticos</p>
          </div>
          <div>
            <p className="omega-exec-stat__value">{metrics.openCount}</p>
            <p className="omega-exec-stat__label">Abiertos</p>
          </div>
          <div>
            <p className="omega-exec-stat__value">{metrics.totalEvents}</p>
            <p className="omega-exec-stat__label">Total</p>
          </div>
        </div>

        {metrics.dominantAreaName ? (
          <div>
            <p className="omega-section-eyebrow">Dónde</p>
            <p className="text-[0.9rem] font-semibold leading-snug text-slate-800">
              {metrics.dominantAreaName}
            </p>
          </div>
        ) : null}

        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className="omega-cmd-context__label">Interno</span>
            <span className="omega-cmd-context__value">
              {metrics.averageImpactInternal}%
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="omega-cmd-context__label">Externo</span>
            <span className="omega-cmd-context__value">
              {metrics.averageImpactExternal}%
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="omega-cmd-context__label">Estudiantes</span>
            <span className="omega-cmd-context__value">
              {metrics.averageImpactStudents}%
            </span>
          </div>
        </div>
      </div>
    </aside>
  )
}
