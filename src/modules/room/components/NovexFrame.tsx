// Componente: marco principal de la Sala Novex
// Responsabilidad: enmarcar la experiencia como gran pantalla operativa, con
// borde, glow y reflejo reactivos al estado operativo del área.

import type { ReactNode } from 'react'
import type { RoomEnvironment } from '@/modules/room/constants/roomTheme'

interface NovexFrameProps {
  children: ReactNode
  /** Estado ambiental ya calculado aguas arriba (room no lo calcula). */
  environment?: RoomEnvironment
}

export function NovexFrame({ children, environment }: NovexFrameProps) {
  return (
    <div className="novex-os-frame" data-environment={environment}>
      {children}
    </div>
  )
}
