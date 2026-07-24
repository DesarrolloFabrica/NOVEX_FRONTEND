// Componente: deck de la Gran Pantalla del Centro de Monitoreo.
// Unifica las regiones internas del Cristal Maestro con acentos ambientales
// reactivos al estado operativo del área. Solo presentación.

import type { ReactNode } from 'react'
import type { EnvironmentStatus } from '@/modules/monitoring/types/monitoring.types'
import { getOperationalRoomVisual } from '@/modules/monitoring/constants/operationalRoomState'
import { AMBIENT_LIGHT_TRANSITION } from '@/modules/monitoring/constants/ambientLighting'
import { CrystalTopRail } from '@/modules/monitoring/components/CrystalStructure'
import { SCREEN_DECK } from '@/modules/monitoring/constants/monitoringTheme'

interface ScreenDeckProps {
  /** Cabecera incrustada en la parte alta de la pantalla. */
  header: ReactNode
  /** Estado del entorno que ambienta sutilmente la pantalla. */
  environment: EnvironmentStatus
  /** Contenido de la pantalla (rejilla grabada del Cristal Maestro). */
  children: ReactNode
}

export function ScreenDeck({ header, environment, children }: ScreenDeckProps) {
  const visual = getOperationalRoomVisual(environment)

  return (
    <div
      className={`${SCREEN_DECK} relative ${AMBIENT_LIGHT_TRANSITION}`}
    >
      <div
        aria-hidden="true"
        className={`screen-deck-ambient pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b ${visual.deckGradient} to-transparent ${AMBIENT_LIGHT_TRANSITION}`}
      />
      {header}

      <CrystalTopRail accentClass={visual.mainRail} />

      <div className="relative overflow-visible pt-1 lg:flex lg:h-full lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-hidden lg:pt-1">
        {children}
      </div>
    </div>
  )
}
