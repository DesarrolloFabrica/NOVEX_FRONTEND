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
  /**
   * Monta el carril vertical de navegación de plataforma.
   *
   * Por defecto SÍ, de modo que toda experiencia existente conserva su
   * comportamiento sin declarar nada. El Centro Operacional lo desactiva para
   * devolver esos 228 px a la escena.
   *
   * Cuando es `false` el carril NO se renderiza: no queda en el DOM ni en el
   * orden de foco. Es deliberadamente distinto de ocultarlo con
   * `display: none`, que dejaría un carril invisible pero tabulable.
   */
  rail?: boolean
  /** Contenedor estable que puede convertirse en la superficie de pantalla completa. */
  rootRef?: Ref<HTMLDivElement>
}

export function NovexRoom({
  children,
  environment,
  scene,
  immersive = false,
  rail = true,
  rootRef,
}: NovexRoomProps) {
  return (
    <div
      ref={rootRef}
      data-environment-status={environment}
      data-scene={scene}
      data-immersive={immersive ? 'true' : undefined}
      // El grid de la sala tiene dos columnas con carril y una sin él. El
      // atributo es la única señal que necesita el CSS: no hay una segunda
      // estructura de layout que mantener en paralelo.
      data-rail={rail ? undefined : 'none'}
      className="novex-room novex-os"
    >
      <div className="novex-os__backdrop" aria-hidden="true">
        <span className="novex-os__aurora novex-os__aurora--one" />
        <span className="novex-os__aurora novex-os__aurora--two" />
        <span className="novex-os__grid" />
        <span className="novex-os__noise" />
      </div>
      {rail ? <NovexSystemRail /> : null}
      <main className="novex-os__stage">{children}</main>
    </div>
  )
}
