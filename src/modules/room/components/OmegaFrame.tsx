// Componente: marco principal de la Sala O.M.E.G.A.
// Responsabilidad: enmarcar la experiencia como gran pantalla operativa, con
// borde, glow y reflejo reactivos al estado operativo del área.

import type { ReactNode } from 'react'
import type { RoomEnvironment } from '@/modules/room/constants/roomTheme'

interface OmegaFrameProps {
  children: ReactNode
  /** Estado ambiental ya calculado aguas arriba (room no lo calcula). */
  environment?: RoomEnvironment
}

export function OmegaFrame({ children, environment }: OmegaFrameProps) {
  return (
    <div className="omega-os-frame" data-environment={environment}>
      {children}
    </div>
  )
}
