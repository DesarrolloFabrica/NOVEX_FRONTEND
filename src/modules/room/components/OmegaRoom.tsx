import type { ReactNode } from 'react'
import type { RoomEnvironment } from '@/modules/room/constants/roomTheme'
import { OmegaSystemRail } from '@/shared/components/OmegaSystemRail'

export type OmegaScene =
  | 'intelligence'
  | 'events'
  | 'register'
  | 'commitments'

interface OmegaRoomProps {
  /** Videowall: OmegaFrame -> MainScreen -> Dashboard. */
  children: ReactNode
  /** Estado ambiental ya calculado aguas arriba. */
  environment?: RoomEnvironment
  /** Identidad visual del módulo activo; no modifica la estructura. */
  scene: OmegaScene
}

export function OmegaRoom({ children, environment, scene }: OmegaRoomProps) {
  return (
    <div
      data-environment-status={environment}
      data-scene={scene}
      className="omega-room omega-os"
    >
      <div className="omega-os__backdrop" aria-hidden="true">
        <span className="omega-os__aurora omega-os__aurora--one" />
        <span className="omega-os__aurora omega-os__aurora--two" />
        <span className="omega-os__grid" />
        <span className="omega-os__noise" />
      </div>
      <OmegaSystemRail />
      <main className="omega-os__stage">{children}</main>
    </div>
  )
}
