// Componente: marco principal de la Sala O.M.E.G.A.
// Responsabilidad: enmarcar la experiencia como gran pantalla operativa, con
// borde, glow y reflejo reactivos al estado operativo del área.

import type { ReactNode } from 'react'
import type { RoomEnvironment } from '@/modules/room/constants/roomTheme'
import { AMBIENT_LIGHT_TRANSITION } from '@/modules/monitoring/constants/ambientLighting'
import { FRAME_BREATH_HIGHLIGHT } from '@/modules/monitoring/constants/operationalBreathing'
import {
  FRAME_METALLIC_HIGHLIGHT,
  FRAME_METALLIC_RING,
} from '@/modules/monitoring/constants/materialTheme'
import {
  FRAME_INNER_CAVITY,
  FRAME_PLANE_LIFT,
  PLANE_FRAME,
} from '@/modules/monitoring/constants/visualPlanes'
import {
  frameCavityFill,
  frameGlow,
  frameStageFill,
  frameSurface,
  getRoomOperationalVisual,
} from '@/modules/room/constants/roomTheme'

interface OmegaFrameProps {
  children: ReactNode
  /** Estado ambiental ya calculado aguas arriba (room no lo calcula). */
  environment?: RoomEnvironment
}

export function OmegaFrame({ children, environment }: OmegaFrameProps) {
  const visual = environment ? getRoomOperationalVisual(environment) : null

  const ringClass = visual
    ? `ring-1 ring-inset ${visual.frameRing}`
    : FRAME_METALLIC_RING
  const glowClass = visual?.frameGlow ?? frameGlow
  const surfaceTint = visual?.frameSurfaceTint ?? ''

  return (
    <div
      className={`${PLANE_FRAME} ${frameSurface} ${ringClass} ${glowClass} ${FRAME_PLANE_LIFT} ${FRAME_METALLIC_HIGHLIGHT} ${frameStageFill} ${AMBIENT_LIGHT_TRANSITION} transition-shadow duration-700`}
    >
      {visual && (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 rounded-2xl ${AMBIENT_LIGHT_TRANSITION} ${FRAME_BREATH_HIGHLIGHT} ${surfaceTint}`}
        />
      )}
      <div className={`relative ${FRAME_INNER_CAVITY} ${frameCavityFill}`}>{children}</div>
    </div>
  )
}
