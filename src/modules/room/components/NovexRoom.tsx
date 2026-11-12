import type { ReactNode, Ref } from 'react'
import type { RoomEnvironment } from '@/modules/room/constants/roomTheme'

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
      // La sala ya no monta el carril lateral (el Centro usa el menú
      // flotante): el CSS sigue leyendo este atributo para la rejilla de una
      // sola columna.
      data-rail="none"
      className="novex-room novex-os"
    >
      {/* Fondo de la sala: el escenario del circo (platform-backgrounds.css). */}
      <div className="novex-os__backdrop" aria-hidden="true" />
      <main className="novex-os__stage">{children}</main>
    </div>
  )
}
