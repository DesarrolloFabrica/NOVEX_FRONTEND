import type { ReactNode } from 'react'
import type { RoomEnvironment } from '@/modules/room/constants/roomTheme'
import { CunmarkSystemRail } from '@/shared/components/CunmarkSystemRail'

export type CunmarkScene =
  | 'intelligence'
  | 'impact'
  | 'events'
  | 'register'
  | 'commitments'

interface CunmarkRoomProps {
  /** Videowall: CunmarkFrame -> MainScreen -> Dashboard. */
  children: ReactNode
  /** Estado ambiental ya calculado aguas arriba. */
  environment?: RoomEnvironment
  /** Identidad visual del módulo activo; no modifica la estructura. */
  scene: CunmarkScene
}

export function CunmarkRoom({ children, environment, scene }: CunmarkRoomProps) {
  return (
    <div
      data-environment-status={environment}
      data-scene={scene}
      className="cunmark-room cunmark-os"
    >
      <div className="cunmark-os__backdrop" aria-hidden="true">
        <span className="cunmark-os__aurora cunmark-os__aurora--one" />
        <span className="cunmark-os__aurora cunmark-os__aurora--two" />
        <span className="cunmark-os__grid" />
        <span className="cunmark-os__noise" />
      </div>
      <CunmarkSystemRail />
      <main className="cunmark-os__stage">{children}</main>
    </div>
  )
}
