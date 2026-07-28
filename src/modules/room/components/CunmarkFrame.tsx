// Componente: marco principal de la Sala Cunmark
// Responsabilidad: enmarcar la experiencia como gran pantalla operativa, con
// borde, glow y reflejo reactivos al estado operativo del área.

import type { ReactNode } from 'react'
import type { RoomEnvironment } from '@/modules/room/constants/roomTheme'

interface CunmarkFrameProps {
  children: ReactNode
  /** Estado ambiental ya calculado aguas arriba (room no lo calcula). */
  environment?: RoomEnvironment
}

export function CunmarkFrame({ children, environment }: CunmarkFrameProps) {
  return (
    <div className="cunmark-os-frame" data-environment={environment}>
      {children}
    </div>
  )
}
