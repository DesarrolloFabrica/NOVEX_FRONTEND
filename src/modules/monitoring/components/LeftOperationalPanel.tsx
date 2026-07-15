import type { Area } from '@/modules/areas/types/area.types'
import type { Commitment } from '@/modules/commitments/types/commitment.types'
import type { EnvironmentStatus } from '@/modules/monitoring/types/monitoring.types'
import { CrystalStationHeaderBracket } from '@/modules/monitoring/components/CrystalStructure'
import { OperationalAnimationSlot } from '@/modules/monitoring/components/OperationalAnimationSlot'
import { SelectedCommitmentPanel } from '@/modules/monitoring/components/SelectedCommitmentPanel'
import {
  CONTEXT_AREA_NAME,
  CONTEXT_STATION_TITLE,
  CONTEXT_SUBTITLE,
  CONTEXT_ZONE,
} from '@/modules/monitoring/constants/visualHierarchy'
import {
  CRYSTAL_ZONE_SUPPORT,
  ENVIRONMENT_THEME,
} from '@/modules/monitoring/constants/monitoringTheme'
import { getOperationalRoomVisual } from '@/modules/monitoring/constants/operationalRoomState'
import { AMBIENT_ACCENT_TRANSITION } from '@/modules/monitoring/constants/ambientLighting'

interface LeftOperationalPanelProps {
  area: Area | undefined
  isGlobal: boolean
  environment: EnvironmentStatus
  selectedCommitment: Commitment | null
  canValidate: boolean
  isUpdating: boolean
  onValidateCommitment: (status: 'Cumplido' | 'Incumplido') => void
}

export function LeftOperationalPanel({
  area,
  isGlobal,
  environment,
  selectedCommitment,
  canValidate,
  isUpdating,
  onValidateCommitment,
}: LeftOperationalPanelProps) {
  const roomVisual = getOperationalRoomVisual(environment)
  const environmentTheme = ENVIRONMENT_THEME[environment]

  return (
    <aside
      className={`left-operational-panel relative flex h-full min-h-0 flex-col overflow-hidden ${CONTEXT_ZONE} ${CRYSTAL_ZONE_SUPPORT}`}
    >
      {roomVisual.sidePanelVeil ? (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 ${AMBIENT_ACCENT_TRANSITION} ${roomVisual.sidePanelVeil}`}
        />
      ) : null}

      <header className="relative flex shrink-0 items-center gap-2.5">
        <h2 className={`flex items-center gap-2.5 ${CONTEXT_STATION_TITLE}`}>
          <CrystalStationHeaderBracket />
          <span
            aria-hidden="true"
            className={`h-2 w-2 shrink-0 rounded-full ${AMBIENT_ACCENT_TRANSITION} ${roomVisual.sidePanelAccent}`}
          />
          Seguimiento operativo
        </h2>
      </header>

      <div className="left-operational-panel__context relative mt-2 min-w-0 shrink-0">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <p className={CONTEXT_SUBTITLE}>
            {isGlobal ? 'Vista agregada' : `Área · ${area?.code ?? '—'}`}
          </p>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${environmentTheme.badge}`}
          >
            {environmentTheme.label}
          </span>
        </div>
        <p className={`mt-1 truncate ${CONTEXT_AREA_NAME}`}>
          {area?.name ?? 'Área desconocida'}
        </p>
      </div>

      <div className="left-operational-panel__content relative mt-3 flex min-h-0 flex-1 flex-col items-center overflow-hidden">
        <OperationalAnimationSlot />
        <SelectedCommitmentPanel
          commitment={selectedCommitment}
          canValidate={canValidate}
          isUpdating={isUpdating}
          onValidate={onValidateCommitment}
        />
      </div>
    </aside>
  )
}
