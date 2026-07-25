// Componente: pantalla principal (Cristal Maestro) de la Sala O.M.E.G.A.
// Lámina técnica con material estratificado, espesor y tinte ambiental.
// Solo presentación — no altera layout ni composición del Centro.

import type { ReactNode } from 'react'
import type { RoomEnvironment } from '@/modules/room/constants/roomTheme'

interface MainScreenProps {
  children: ReactNode
  /** Estado ambiental ya calculado aguas arriba (room no lo calcula). */
  environment?: RoomEnvironment
}

export function MainScreen({ children, environment }: MainScreenProps) {
  return (
    <div className="omega-os-surface" data-environment={environment}>
      {children}
    </div>
  )
}
