// Contenedor externo de toda la experiencia de la Sala O.M.E.G.A.
// Monta las capas visuales de referencia y ubica el Cristal Maestro encima.

import type { ReactNode } from 'react'
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
  /** Videowall: OmegaFrame -> MainScreen -> Dashboard. */
  children: ReactNode
  /** Estado ambiental ya calculado aguas arriba. */
  environment?: RoomEnvironment
}

const CITY_LAYERS: Array<{
  environment: RoomEnvironment
  src: string
}> = [
  {
    environment: 'pending',
    src: '/capas/CapasCiudad/primeraCapa.png',
  },
  {
    environment: 'healthy',
    src: '/capas/CapasCiudad/verde.png',
  },
  {
    environment: 'attention',
    src: '/capas/CapasCiudad/amarillo.png',
  },
  {
    environment: 'critical',
    src: '/capas/CapasCiudad/rojo.png',
  },
]

const ARCHITECTURE_LAYERS: Array<{
  environment: RoomEnvironment
  src: string
}> = [
  {
    environment: 'pending',
    src: '/capas/centroOP/AZUL.png',
  },
  {
    environment: 'healthy',
    src: '/capas/centroOP/VERDE.png',
  },
  {
    environment: 'attention',
    src: '/capas/centroOP/AMARILLO.png',
  },
  {
    environment: 'critical',
    src: '/capas/centroOP/ROJO.png',
  },
]

const CONSOLE_LAYERS: Array<{
  environment: RoomEnvironment
  src: string
}> = [
  {
    environment: 'pending',
    src: '/capas/consola/azul.png',
  },
  {
    environment: 'healthy',
    src: '/capas/consola/verde.png',
  },
  {
    environment: 'attention',
    src: '/capas/consola/amarillo.png',
  },
  {
    environment: 'critical',
    src: '/capas/consola/roja.png',
  },
]

export function OmegaRoom({ children, environment }: OmegaRoomProps) {
  const visual = environment ? getRoomOperationalVisual(environment) : null
  const roomStatus = deriveRoomStatus(environment)
  const activeEnvironment = environment ?? 'pending'

  return (
    <div
      data-environment-status={environment}
      className={`omega-room omega-room--reference scene--${roomStatus} ${PLANE_ROOM} relative ${roomBackground} ${roomDepth} ${AMBIENT_LIGHT_TRANSITION} ${visual?.textIntensity ?? ''}`}
    >
      <div className="room-reference-canvas">
        <div className="room-reference-layers" aria-hidden="true">
          {CITY_LAYERS.map((cityLayer) => (
            <img
              key={`city-${cityLayer.environment}`}
              src={cityLayer.src}
              alt=""
              draggable={false}
              decoding="async"
              data-active={cityLayer.environment === activeEnvironment}
              className="room-reference-layer room-reference-layer--city"
            />
          ))}
          {ARCHITECTURE_LAYERS.map((architectureLayer) => (
            <img
              key={`architecture-${architectureLayer.environment}`}
              src={architectureLayer.src}
              alt=""
              draggable={false}
              decoding="async"
              data-active={
                architectureLayer.environment === activeEnvironment
              }
              className="room-reference-layer room-reference-layer--architecture"
            />
          ))}
        </div>

        <div className="room-atmosphere" aria-hidden="true" />
        <div className="room-depth-haze" aria-hidden="true" />
        <div className="room-ambient-vignette" aria-hidden="true" />
        <div className="room-reference-projector" aria-hidden="true" />

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

        <div className={`room-screen-stage relative ${roomSceneRow} ${roomOuterPadding}`}>
          <div className={`${roomVideowallUnit} ${roomSceneViewport}`}>
            <div className="main-screen">{children}</div>
          </div>
        </div>

        <div className="room-reference-base-stack" aria-hidden="true">
          {CONSOLE_LAYERS.map((consoleLayer) => (
            <img
              key={`console-${consoleLayer.environment}`}
              src={consoleLayer.src}
              alt=""
              draggable={false}
              decoding="async"
              data-active={consoleLayer.environment === activeEnvironment}
              className="room-reference-base"
            />
          ))}
        </div>

        <div className="room-monitor-reflection" aria-hidden="true" />
      </div>
    </div>
  )
}
