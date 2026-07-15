// Componente: estación de inteligencia (columna derecha del cristal).
// Panel continuo — riesgo agregado, cumplimiento, alertas e indicadores.

import type { ReactNode } from 'react'
import type { AreaHealth, EnvironmentStatus } from '@/modules/monitoring/types/monitoring.types'
import { AlertsDistribution } from '@/modules/monitoring/components/AlertsDistribution'
import { CrystalStructuralRule, CrystalStationHeaderBracket } from '@/modules/monitoring/components/CrystalStructure'
import { OperationalRiskKpi } from '@/modules/monitoring/components/OperationalRiskKpi'
import { ProjectedCommitmentKpi } from '@/modules/monitoring/components/ProjectedCommitmentKpi'
import {
  INTEL_STATION_TITLE,
  INTEL_ZONE,
} from '@/modules/monitoring/constants/visualHierarchy'
import {
  CRYSTAL_ETCH_GAP,
  CRYSTAL_SECTION_TAIL,
  CRYSTAL_STATION_LEAD,
  CRYSTAL_ZONE_SUPPORT,
  TEXT_LABEL,
} from '@/modules/monitoring/constants/monitoringTheme'
import { getOperationalRoomVisual } from '@/modules/monitoring/constants/operationalRoomState'
import { AMBIENT_ACCENT_TRANSITION } from '@/modules/monitoring/constants/ambientLighting'
import { ETCHED_GROOVE_SHADOW } from '@/modules/monitoring/constants/materialTheme'

interface IntelligencePanelProps {
  health: AreaHealth
  criticalCount: number
  projectedTitle: string | null
  /** Estado del área enfocada (acento de estación en el cristal). */
  environment: EnvironmentStatus
}

function PanelSection({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <CrystalStructuralRule />
      <div className={`${CRYSTAL_ETCH_GAP} ${ETCHED_GROOVE_SHADOW}`}>{children}</div>
    </div>
  )
}

export function IntelligencePanel({
  health,
  criticalCount,
  projectedTitle,
  environment,
}: IntelligencePanelProps) {
  const roomVisual = getOperationalRoomVisual(environment)

  return (
    <aside
      className={`operations-intelligence-panel relative flex h-full flex-col ${INTEL_ZONE} ${CRYSTAL_ZONE_SUPPORT}`}
    >
      {roomVisual.sidePanelVeil && (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 ${AMBIENT_ACCENT_TRANSITION} ${roomVisual.sidePanelVeil}`}
        />
      )}

      <header className="operations-intelligence-header relative flex items-center gap-2.5">
        <h2 className={`flex items-center gap-2.5 ${INTEL_STATION_TITLE}`}>
          <CrystalStationHeaderBracket />
          <span
            aria-hidden="true"
            className={`h-2 w-2 shrink-0 rounded-full ${AMBIENT_ACCENT_TRANSITION} ${roomVisual.sidePanelAccent}`}
          />
          Inteligencia operativa
        </h2>
      </header>

      <PanelSection className={`intelligence-risk-section ${CRYSTAL_STATION_LEAD}`}>
        <OperationalRiskKpi health={health} environment={environment} />
      </PanelSection>

      <PanelSection className={`kpi-alerts-section ${CRYSTAL_SECTION_TAIL}`}>
        <p className={`mb-2 ${TEXT_LABEL}`}>Alertas</p>
        <AlertsDistribution
          incumplidos={health.breachedCount}
          criticos={criticalCount}
          pendientes={health.pendingCount}
        />
      </PanelSection>

      <PanelSection className={`secondary-indicators-section ${CRYSTAL_SECTION_TAIL}`}>
        <p className={`mb-2.5 ${TEXT_LABEL}`}>Compromiso priorizado</p>
        <ProjectedCommitmentKpi title={projectedTitle} />
      </PanelSection>
    </aside>
  )
}
