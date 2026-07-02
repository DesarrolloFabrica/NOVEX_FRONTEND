// Componente: contenedor externo de toda la experiencia de la Sala O.M.E.G.A.
// Responsabilidad: aportar el escenario físico exterior (fondo, profundidad,
// iluminación general reactiva al estado operativo del área).
// Sprint 9.1: Cristal Maestro (children) y Sistema de Proyección (projection) como capas hermanas.
// Sprint 9.2B: proyección flotante en primer plano, sin fila que genere scroll.
// Sprint 10.3: videowall más estrecho en desktop — unidad arquitectónica centrada.

import type { ReactNode } from 'react'
import type { RoomEnvironment } from '@/modules/room/constants/roomTheme'
import { PLANE_ROOM, ROOM_VIGNETTE } from '@/modules/monitoring/constants/visualPlanes'
import { AMBIENT_LIGHT_TRANSITION } from '@/modules/monitoring/constants/ambientLighting'
import {
  ROOM_BREATH_DEPTH,
  ROOM_BREATH_OVERLAY,
} from '@/modules/monitoring/constants/operationalBreathing'
import {
  getRoomOperationalVisual,
  roomBackground,
  roomDepth,
  roomOuterPadding,
  roomSceneRow,
  roomSceneViewport,
  roomVideowallUnit,
} from '@/modules/room/constants/roomTheme'

interface OmegaRoomProps {
  /** Videowall: OmegaFrame → MainScreen → Dashboard. */
  children: ReactNode
  /** Sistema de Proyección: plataforma + holograma (hermano del marco, no del cristal). */
  projection?: ReactNode
  /** Estado ambiental ya calculado aguas arriba (room no lo calcula). */
  environment?: RoomEnvironment
}

export function OmegaRoom({ children, projection, environment }: OmegaRoomProps) {
  const visual = environment ? getRoomOperationalVisual(environment) : null

  return (
    <div
      className={`${PLANE_ROOM} relative ${roomBackground} ${roomDepth} ${AMBIENT_LIGHT_TRANSITION} ${visual?.textIntensity ?? ''}`}
    >
      <div aria-hidden="true" className={ROOM_VIGNETTE} />
      {visual && (
        <>
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 ${AMBIENT_LIGHT_TRANSITION} ${ROOM_BREATH_OVERLAY} ${visual.backgroundOverlay}`}
          />
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 ${AMBIENT_LIGHT_TRANSITION} ${ROOM_BREATH_DEPTH} ${visual.roomDepthAccent}`}
          />
        </>
      )}

      <div className={`relative ${roomSceneRow} ${roomOuterPadding}`}>
        <div className={`${roomVideowallUnit} ${roomSceneViewport}`}>{children}</div>
      </div>

      {projection}
    </div>
  )
}
