// Componente: escenario del Sistema de Proyección (Sprint 9.1 / 9.2B).
// Capa flotante de la sala — hermana del OmegaFrame, no hija del Dashboard.
// Sprint 9.2B: primer plano absoluto, superpuesto al cristal, sin scroll.

import type { Commitment } from '@/modules/commitments/types/commitment.types'
import { CommitmentHologram } from '@/modules/monitoring/components/CommitmentHologram'
import { ProjectionPlatform } from '@/modules/monitoring/components/ProjectionPlatform'
import { getOperationalRoomVisual } from '@/modules/monitoring/constants/operationalRoomState'
import { PLANE_PROJECTION_STACK } from '@/modules/monitoring/constants/visualPlanes'
import type { RoomEnvironment } from '@/modules/room/constants/roomTheme'
import {
  roomProjectionStage,
  roomProjectionStageAlign,
} from '@/modules/room/constants/roomTheme'

interface ProjectionStageProps {
  environment: RoomEnvironment
  selectedCommitment: Commitment | null
  canValidate: boolean
  isUpdating: boolean
  onValidateCommitment: (status: 'Cumplido' | 'Incumplido') => void
}

export function ProjectionStage({
  environment,
  selectedCommitment,
  canValidate,
  isUpdating,
  onValidateCommitment,
}: ProjectionStageProps) {
  const roomVisual = getOperationalRoomVisual(environment)

  return (
    <div
      className={`${PLANE_PROJECTION_STACK} ${roomProjectionStage}`}
      role="region"
      aria-label="Sistema de proyección del Centro de Monitoreo"
      data-projection-interactive
    >
      <div className={roomProjectionStageAlign}>
        <ProjectionPlatform
          isActive={selectedCommitment !== null}
          platformRailIdle={roomVisual.platformRailIdle}
          platformDeckIdle={roomVisual.platformDeckIdle}
        >
          <CommitmentHologram
            commitment={selectedCommitment}
            canValidate={canValidate}
            isUpdating={isUpdating}
            onValidate={onValidateCommitment}
          />
        </ProjectionPlatform>
      </div>
    </div>
  )
}
