// Componente: contenedor externo de toda la experiencia de la Sala O.M.E.G.A.
// Responsabilidad: escenario físico exterior — ciudad, profundidad e
// iluminación ambiental reactiva. La ciudad complementa las capas CSS de luz,
// que se conservan como estructura y fallback visual.
// El Cristal Maestro contiene toda la interacción operativa del videowall.

import type { ReactNode } from 'react'
import { RoomCityLayer } from '@/modules/room/components/RoomCityLayer'
import type { RoomEnvironment } from '@/modules/room/constants/roomTheme'
import { PLANE_ROOM } from '@/modules/monitoring/constants/visualPlanes'
import { AMBIENT_LIGHT_TRANSITION } from '@/modules/monitoring/constants/ambientLighting'
import {
  getRoomOperationalVisual,
  roomBackground,
  roomDepth,
  roomOuterPadding,
  roomSceneRow,
  roomSceneViewport,
  roomVideowallUnit,
} from '@/modules/room/constants/roomTheme'
import { deriveRoomStatus } from '@/modules/room/utils/deriveRoomStatus'

interface OmegaRoomProps {
  /** Videowall: OmegaFrame → MainScreen → Dashboard. */
  children: ReactNode
  /** Estado ambiental ya calculado aguas arriba (room no lo calcula). */
  environment?: RoomEnvironment
}

export function OmegaRoom({ children, environment }: OmegaRoomProps) {
  const visual = environment ? getRoomOperationalVisual(environment) : null
  // roomStatus: stable | attention | critical — ilumina toda la atmósfera
  const roomStatus = deriveRoomStatus(environment)

  return (
    <div
      className={`omega-room scene--${roomStatus} ${PLANE_ROOM} relative ${roomBackground} ${roomDepth} ${AMBIENT_LIGHT_TRANSITION} ${visual?.textIntensity ?? ''}`}
    >
      {/* Plano 0: delante del fondo CSS y detrás de la atmósfera. */}
      {environment ? <RoomCityLayer environment={environment} /> : null}

      {/*
        Integración mínima de esta fase: la ciudad es el escenario principal.
        Techo, paredes y piso CSS permanecen disponibles, pero no se montan.
      */}
      <div className="room-atmosphere" aria-hidden="true" />
      <div className="room-depth-haze" aria-hidden="true" />
      <div className="room-ambient-vignette" aria-hidden="true" />

      {visual && (
        <>
          <div
            aria-hidden="true"
            className={`room-state-wash pointer-events-none absolute inset-0 z-[2] ${AMBIENT_LIGHT_TRANSITION} ${visual.backgroundOverlay}`}
          />
          <div
            aria-hidden="true"
            className={`room-state-wash pointer-events-none absolute inset-0 z-[2] ${AMBIENT_LIGHT_TRANSITION} ${visual.roomDepthAccent}`}
          />
        </>
      )}

      {/* Pantalla principal — elemento dominante de la composición */}
      <div className={`room-screen-stage relative ${roomSceneRow} ${roomOuterPadding}`}>
        <div className={`${roomVideowallUnit} ${roomSceneViewport}`}>
          <div className="main-screen">{children}</div>
        </div>
      </div>

      {/* Reflejo del monitor en el piso — mancha de luz bajo la pantalla */}
      <div className="room-monitor-reflection" aria-hidden="true" />
    </div>
  )
}
