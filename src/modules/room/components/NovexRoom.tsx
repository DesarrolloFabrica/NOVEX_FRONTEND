import type { ReactNode } from 'react'
import type { RoomEnvironment } from '@/modules/room/constants/roomTheme'
import { NovexSystemRail } from '@/shared/components/NovexSystemRail'

export type NovexScene =
  | 'intelligence'
  | 'impact'
  | 'events'
  | 'register'
  | 'commitments'

interface NovexRoomProps {
  /** Videowall: NovexFrame -> MainScreen -> Dashboard. */
  children: ReactNode
  /** Estado ambiental ya calculado aguas arriba. */
  environment?: RoomEnvironment
  /** Identidad visual del módulo activo; no modifica la estructura. */
  scene: NovexScene
  /** Oculta el rail lateral cuando la Red de impacto está en modo inmersivo. */
  immersive?: boolean
}

export function NovexRoom({
  children,
  environment,
  scene,
  immersive = false,
}: NovexRoomProps) {
  return (
    <div
      data-environment-status={environment}
      data-scene={scene}
      data-immersive={immersive ? 'true' : undefined}
      className="novex-room novex-os"
    >
      <div className="novex-os__backdrop" aria-hidden="true">
        <span className="novex-os__aurora novex-os__aurora--one" />
        <span className="novex-os__aurora novex-os__aurora--two" />
        <span className="novex-os__grid" />
        <span className="novex-os__noise" />
      </div>
      <NovexSystemRail />
      <main className="novex-os__stage">{children}</main>
    </div>
  )
}
