// Componente: deck de la Gran Pantalla del Centro de Monitoreo.
// Unifica las regiones internas del Cristal Maestro con acentos ambientales
// reactivos al estado operativo del área. Solo presentación.

import type { ReactNode } from 'react'
import type { EnvironmentStatus } from '@/modules/monitoring/types/monitoring.types'

interface ScreenDeckProps {
  /** Cabecera incrustada en la parte alta de la pantalla. */
  header: ReactNode
  /** Estado del entorno que ambienta sutilmente la pantalla. */
  environment: EnvironmentStatus
  /** Contenido de la pantalla (rejilla grabada del Cristal Maestro). */
  children: ReactNode
}

export function ScreenDeck({ header, environment, children }: ScreenDeckProps) {
  return (
    <div className="omega-os-deck" data-environment={environment}>
      {header}
      <div className="omega-os-deck__content">{children}</div>
    </div>
  )
}
