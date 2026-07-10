// Componente: contenedor externo de toda la experiencia de la Sala O.M.E.G.A.
// Responsabilidad: escenario físico exterior — profundidad e iluminación
// ambiental reactiva. Sin consolas, modelos ni imágenes: la sala se construye
// solo con capas de luz (techo, paredes, piso, atmósfera).
// Sprint 9.1+: Cristal Maestro (children) y proyección (projection) como capas hermanas.

import type { ReactNode } from 'react'
import type { RoomEnvironment } from '@/modules/room/constants/roomTheme'
import { PLANE_ROOM } from '@/modules/monitoring/constants/visualPlanes'
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
import { deriveRoomStatus } from '@/modules/room/utils/deriveRoomStatus'

interface OmegaRoomProps {
  /** Videowall: OmegaFrame → MainScreen → Dashboard. */
  children: ReactNode
  /** Sistema de Proyección: plataforma + holograma (hermano del marco). */
  projection?: ReactNode
  /** Estado ambiental ya calculado aguas arriba (room no lo calcula). */
  environment?: RoomEnvironment
  /** Compromiso enfocado — intensifica el haz de proyección decorativo. */
  projectionActive?: boolean
}

export function OmegaRoom({ children, projection, environment, projectionActive }: OmegaRoomProps) {
  const visual = environment ? getRoomOperationalVisual(environment) : null
  // roomStatus: stable | attention | critical — ilumina toda la atmósfera
  const roomStatus = deriveRoomStatus(environment)

  return (
    <div
      className={`omega-room scene--${roomStatus}${projectionActive ? ' projection-active' : ''} ${PLANE_ROOM} relative ${roomBackground} ${roomDepth} ${AMBIENT_LIGHT_TRANSITION} ${visual?.textIntensity ?? ''}`}
    >
      {/*
        Arquitectura por iluminación (pointer-events: none).
        Jerarquía: atmósfera → techo → paredes → profundidad → piso → monitor.
      */}
      <div className="room-atmosphere" aria-hidden="true" />
      {/* Focos cenitales — conos de luz desde el techo (detrás de ranuras) */}
      <div className="room-ceiling-spotlights" aria-hidden="true" />
      {/* Techo — ranuras LED + wash arquitectónico */}
      <div className="room-ceiling-lighting" aria-hidden="true" />
      {/* Paredes laterales — profundidad de sala (degradados + LED arquitectónicos) */}
      <div className="room-side-walls" aria-hidden="true" />
      <div className="room-depth-haze" aria-hidden="true" />
      <div className="room-ambient-vignette" aria-hidden="true" />

      {/* Plataforma de piso técnico — ancla el monitor en la sala */}
      <div className="room-floor-platform" aria-hidden="true">
        <div className="room-floor-glow" />
        <div className="room-floor-rings" />
        <div className="room-floor-lines" />
        <div className="room-floor-reflect" />
      </div>

      {visual && (
        <>
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 z-[2] ${AMBIENT_LIGHT_TRANSITION} ${ROOM_BREATH_OVERLAY} ${visual.backgroundOverlay}`}
          />
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 z-[2] ${AMBIENT_LIGHT_TRANSITION} ${ROOM_BREATH_DEPTH} ${visual.roomDepthAccent}`}
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

      {/* Haz de proyección — cono de luz entre plataforma y holograma */}
      <div className="room-projection-beam" aria-hidden="true" />

      {/* Proyección — capa espacial absoluta; no desplaza el monitor */}
      {projection ? (
        <section
          className="operative-projection"
          aria-label="Proyección operativa"
          data-projection-layer
        >
          {projection}
        </section>
      ) : null}
    </div>
  )
}
