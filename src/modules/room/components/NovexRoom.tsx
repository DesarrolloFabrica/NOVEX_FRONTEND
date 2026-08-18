import type { ReactNode, Ref } from 'react'
import type { RoomEnvironment } from '@/modules/room/constants/roomTheme'
import { NovexSystemRail } from '@/shared/components/NovexSystemRail'

export type NovexScene =
  'intelligence' | 'impact' | 'events' | 'register' | 'commitments' | 'admin'

interface NovexRoomProps {
  /** Videowall: NovexFrame -> MainScreen -> Dashboard. */
  children: ReactNode
  /** Estado ambiental ya calculado aguas arriba. */
  environment?: RoomEnvironment
  /** Identidad visual del módulo activo; no modifica la estructura. */
  scene: NovexScene
  /** Activa los ajustes visuales de pantalla completa de la plataforma. */
  immersive?: boolean
  /** Contenedor estable que puede convertirse en la superficie de pantalla completa. */
  rootRef?: Ref<HTMLDivElement>
}

export function NovexRoom({
  children,
  environment,
  scene,
  immersive = false,
  rootRef,
}: NovexRoomProps) {
  return (
    <div
      ref={rootRef}
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
