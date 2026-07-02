// Componente: estación de contexto del área (columna izquierda del cristal).
// Grabada sobre la superficie unificada: títulos, rieles y reglas estructurales.
// Sin caja propia ni fondo independiente. Solo presentación.

import type { ReactNode } from 'react'
import type { Area } from '@/modules/areas/types/area.types'
import type { AreaHealth } from '@/modules/monitoring/types/monitoring.types'
import { CrystalStructuralRule, CrystalStationHeaderBracket } from '@/modules/monitoring/components/CrystalStructure'
import {
  CONTEXT_AREA_NAME,
  CONTEXT_METRIC,
  CONTEXT_ROW_LABEL,
  CONTEXT_ROW_VALUE,
  CONTEXT_STATION_TITLE,
  CONTEXT_SUBTITLE,
  CONTEXT_ZONE,
} from '@/modules/monitoring/constants/visualHierarchy'
import {
  CRYSTAL_DATA_STACK,
  CRYSTAL_ETCH_GAP,
  CRYSTAL_INLINE_BLOCK,
  CRYSTAL_LABEL_GAP,
  CRYSTAL_SECTION_TAIL,
  CRYSTAL_STATION_LEAD,
  CRYSTAL_ZONE_SUPPORT,
  ENVIRONMENT_THEME,
  TEXT_LABEL,
} from '@/modules/monitoring/constants/monitoringTheme'
import { getOperationalRoomVisual } from '@/modules/monitoring/constants/operationalRoomState'
import { AMBIENT_ACCENT_TRANSITION } from '@/modules/monitoring/constants/ambientLighting'
import {
  CRYSTAL_ETCHED_DATA_BLOCK,
  ETCHED_GROOVE_SHADOW,
} from '@/modules/monitoring/constants/materialTheme'

interface AreaContextPanelProps {
  area: Area | undefined
  health: AreaHealth
  isGlobal: boolean
}

function CountRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={CONTEXT_ROW_LABEL}>{label}</span>
      <span className={CONTEXT_ROW_VALUE}>{value}</span>
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

export function AreaContextPanel({
  area,
  health,
  isGlobal,
}: AreaContextPanelProps) {
  const theme = ENVIRONMENT_THEME[health.environment]
  const roomVisual = getOperationalRoomVisual(health.environment)

  return (
    <aside className={`relative flex h-full flex-col ${CONTEXT_ZONE} ${CRYSTAL_ZONE_SUPPORT}`}>
      {roomVisual.sidePanelVeil && (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 ${AMBIENT_ACCENT_TRANSITION} ${roomVisual.sidePanelVeil}`}
        />
      )}
      <h2 className={`relative flex items-center gap-2.5 ${CONTEXT_STATION_TITLE}`}>
        <CrystalStationHeaderBracket />
        <span
          aria-hidden="true"
          className={`h-2 w-2 shrink-0 rounded-full ${AMBIENT_ACCENT_TRANSITION} ${roomVisual.sidePanelAccent}`}
        />
        Contexto operativo
      </h2>

      <div className={CRYSTAL_STATION_LEAD}>
        <p className={CONTEXT_SUBTITLE}>
          {isGlobal ? 'Vista agregada' : `Área · ${area?.code ?? '—'}`}
        </p>
        <p className={`${CRYSTAL_LABEL_GAP} ${CONTEXT_AREA_NAME}`}>
          {area?.name ?? 'Área desconocida'}
        </p>
      </div>

      <div className={`${CRYSTAL_INLINE_BLOCK} flex items-center gap-2.5`}>
        <span
          className={`h-2 w-2 rounded-full transition-colors duration-500 ${theme.dot}`}
          aria-hidden="true"
        />
        <span
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium opacity-92 transition-colors duration-500 ${theme.badge}`}
        >
          {theme.label}
        </span>
      </div>

      <EtchedSection className={CRYSTAL_STATION_LEAD}>
        <p className={TEXT_LABEL}>Riesgo operativo</p>
        <p className={`${CRYSTAL_LABEL_GAP} ${CONTEXT_METRIC}`}>
          {health.operationalRiskPercentage}%
        </p>
      </EtchedSection>

      <EtchedSection className={CRYSTAL_SECTION_TAIL}>
        <div className={`${CRYSTAL_DATA_STACK} ${CRYSTAL_ETCHED_DATA_BLOCK}`}>
          <CountRow label="Pendientes" value={health.pendingCount} />
          <CountRow label="Cumplidos" value={health.fulfilledCount} />
          <CountRow label="Incumplidos" value={health.breachedCount} />
        </div>
      </EtchedSection>
    </aside>
  )
}
