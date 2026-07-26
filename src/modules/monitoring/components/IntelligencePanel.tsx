// Componente: estación de inteligencia — resumen único del área.

import type { AreaHealth, EnvironmentStatus } from '@/modules/monitoring/types/monitoring.types'
import { CrystalStationHeaderBracket } from '@/modules/monitoring/components/CrystalStructure'
import {
  INTEL_STATION_TITLE,
  INTEL_ZONE,
} from '@/modules/monitoring/constants/visualHierarchy'
import {
  CRYSTAL_ZONE_SUPPORT,
  TEXT_LABEL,
} from '@/modules/monitoring/constants/monitoringTheme'
import { getOperationalRoomVisual } from '@/modules/monitoring/constants/operationalRoomState'
import { AMBIENT_ACCENT_TRANSITION } from '@/modules/monitoring/constants/ambientLighting'
import { OmegaIcon } from '@/shared/components/OmegaIcon'

interface IntelligencePanelProps {
  health: AreaHealth
  criticalCount: number
  projectedTitle: string | null
  environment: EnvironmentStatus
  areaLabel?: string
}

function StatRow({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className={TEXT_LABEL}>{label}</span>
      <strong className="font-mono text-sm tabular-nums text-slate-200">
        {value}
      </strong>
    </div>
  )
}

export function IntelligencePanel({
  health,
  criticalCount,
  projectedTitle,
  environment,
  areaLabel,
}: IntelligencePanelProps) {
  const roomVisual = getOperationalRoomVisual(environment)
  const nextAction = projectedTitle
    ? `Validar: ${projectedTitle}`
    : criticalCount > 0
      ? 'Revise los compromisos críticos en la lista central.'
      : health.pendingCount > 0
        ? 'Hay pendientes por calificar. Elija uno a la izquierda tras seleccionarlo.'
        : 'No hay acción urgente en esta área.'

  return (
    <aside
      className={`operations-intelligence-panel relative flex h-full min-h-0 flex-col ${INTEL_ZONE} ${CRYSTAL_ZONE_SUPPORT}`}
    >
      <section className="operations-intelligence-panel__health">
        {roomVisual.sidePanelVeil && (
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 ${AMBIENT_ACCENT_TRANSITION} ${roomVisual.sidePanelVeil}`}
          />
        )}
        <header className="operations-intelligence-header relative flex flex-col gap-1">
          <h2 className={`flex items-center gap-2.5 ${INTEL_STATION_TITLE}`}>
            <CrystalStationHeaderBracket />
            Salud del área
          </h2>
          {areaLabel ? (
            <p className="omega-section-hint mb-0 pl-5">{areaLabel}</p>
          ) : null}
        </header>

        <div className="operations-intelligence-panel__gauge" aria-label={`Riesgo operativo ${health.operationalRiskPercentage}%`}>
          <strong>{health.operationalRiskPercentage}%</strong>
          <span>Riesgo operativo</span>
        </div>

        <div className="operations-intelligence-panel__stats">
          <StatRow label="Cumplidos" value={health.fulfilledCount} />
          <StatRow label="No cumplidos" value={health.breachedCount} />
          <StatRow label="Pendientes" value={health.pendingCount} />
          <StatRow label="Críticos" value={criticalCount} />
        </div>
      </section>

      <section className="operations-intelligence-panel__next-action">
        <header>
          <OmegaIcon name="sparkles" size={18} />
          <span>Qué hacer ahora</span>
        </header>
        <p>{nextAction}</p>
        <span className="operations-intelligence-panel__next-arrow" aria-hidden="true">
          <OmegaIcon name="chevron-right" size={19} />
        </span>
      </section>
    </aside>
  )
}
