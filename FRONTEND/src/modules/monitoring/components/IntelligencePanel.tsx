// Componente: estación de inteligencia (columna derecha del cristal).
// Grabada sobre la superficie unificada: títulos, rieles y reglas estructurales.
// Sin caja propia ni fondo independiente. Solo presentación.

import type { ReactNode } from 'react'
import type { AreaHealth } from '@/modules/monitoring/types/monitoring.types'
import type { EnvironmentStatus } from '@/modules/monitoring/types/monitoring.types'
import { CrystalStructuralRule, CrystalStationHeaderBracket } from '@/modules/monitoring/components/CrystalStructure'
import {
  INTEL_ALERT_VALUE,
  INTEL_BODY,
  INTEL_EMPTY,
  INTEL_METRIC,
  INTEL_STATION_TITLE,
  INTEL_ZONE,
  CONTEXT_ROW_LABEL,
} from '@/modules/monitoring/constants/visualHierarchy'
import {
  CRYSTAL_DATA_STACK,
  CRYSTAL_ETCH_GAP,
  CRYSTAL_LABEL_GAP,
  CRYSTAL_SECTION_TAIL,
  CRYSTAL_STATION_LEAD,
  CRYSTAL_ZONE_SUPPORT,
  TEXT_LABEL,
} from '@/modules/monitoring/constants/monitoringTheme'
import { getOperationalRoomVisual } from '@/modules/monitoring/constants/operationalRoomState'
import { AMBIENT_ACCENT_TRANSITION } from '@/modules/monitoring/constants/ambientLighting'
import {
  CRYSTAL_ETCHED_DATA_BLOCK,
  ETCHED_GROOVE_SHADOW,
} from '@/modules/monitoring/constants/materialTheme'

interface IntelligencePanelProps {
  health: AreaHealth
  criticalCount: number
  projectedTitle: string | null
  /** Estado del área enfocada (acento de estación en el cristal). */
  environment: EnvironmentStatus
}

function AlertRow({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'amber' | 'red' | 'slate'
}) {
  const toneClasses: Record<typeof tone, string> = {
    amber: 'text-amber-700',
    red: 'text-red-700',
    slate: 'text-slate-700',
  }
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={CONTEXT_ROW_LABEL}>{label}</span>
      <span className={`${INTEL_ALERT_VALUE} ${toneClasses[tone]}`}>
        {value}
      </span>
    </div>
  )
}

function EtchedSection({
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
    <aside className={`relative flex h-full flex-col ${INTEL_ZONE} ${CRYSTAL_ZONE_SUPPORT}`}>
      {roomVisual.sidePanelVeil && (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 ${AMBIENT_ACCENT_TRANSITION} ${roomVisual.sidePanelVeil}`}
        />
      )}
      <h2 className={`relative flex items-center gap-2.5 ${INTEL_STATION_TITLE}`}>
        <CrystalStationHeaderBracket />
        <span
          aria-hidden="true"
          className={`h-2 w-2 shrink-0 rounded-full ${AMBIENT_ACCENT_TRANSITION} ${roomVisual.sidePanelAccent}`}
        />
        Inteligencia operativa
      </h2>

      <EtchedSection className={CRYSTAL_STATION_LEAD}>
        <p className={TEXT_LABEL}>Riesgo operativo</p>
        <p className={`${CRYSTAL_LABEL_GAP} ${INTEL_METRIC}`}>
          {health.operationalRiskPercentage}%
        </p>
      </EtchedSection>

      <EtchedSection className={CRYSTAL_SECTION_TAIL}>
        <p className={`mb-2.5 ${TEXT_LABEL}`}>Alertas</p>
        <div className={`${CRYSTAL_DATA_STACK} ${CRYSTAL_ETCHED_DATA_BLOCK}`}>
          <AlertRow label="Incumplidos" value={health.breachedCount} tone="red" />
          <AlertRow label="Críticos" value={criticalCount} tone="red" />
          <AlertRow label="Pendientes" value={health.pendingCount} tone="amber" />
        </div>
      </EtchedSection>

      <EtchedSection className={CRYSTAL_SECTION_TAIL}>
        <p className={`mb-2.5 ${TEXT_LABEL}`}>Compromiso proyectado</p>
        {projectedTitle ? (
          <p className={INTEL_BODY}>{projectedTitle}</p>
        ) : (
          <p className={INTEL_EMPTY}>Sin proyección</p>
        )}
      </EtchedSection>
    </aside>
  )
}
