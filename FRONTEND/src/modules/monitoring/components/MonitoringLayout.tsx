// Componente: rejilla del Cristal Maestro (Plano 1).
// Sprint 7.3: estación de trabajo unificada — una losa, zonas funcionales.
// Sprint 9.1: solo dashboard grabado; la proyección vive en ProjectionStage.

import type { ReactNode } from 'react'
import {
  CrystalFieldAnchors,
  CrystalRowGroove,
  CrystalWorkstationLattice,
} from '@/modules/monitoring/components/CrystalStructure'
import {
  CRYSTAL_GRID,
  CRYSTAL_WORKSTATION_MAIN,
  CRYSTAL_WORKSTATION_PLATE,
  ROOM_CONTAINER,
} from '@/modules/monitoring/constants/monitoringTheme'
import { PLANE_ETCHED } from '@/modules/monitoring/constants/visualPlanes'

interface MonitoringLayoutProps {
  left: ReactNode
  main: ReactNode
  right: ReactNode
}

export function MonitoringLayout({ left, main, right }: MonitoringLayoutProps) {
  return (
    <div className={`${ROOM_CONTAINER} relative max-lg:overflow-visible lg:overflow-hidden`}>
      <div
        className={`${PLANE_ETCHED} ${CRYSTAL_WORKSTATION_PLATE} relative flex min-h-0 flex-1 flex-col ${CRYSTAL_GRID}`}
      >
        <CrystalWorkstationLattice />
        <CrystalFieldAnchors />

        <div className="relative order-2 z-[2] min-w-0 max-lg:pt-3 lg:order-1 lg:min-h-0 lg:overflow-hidden lg:pt-0">
          <CrystalRowGroove className="absolute inset-x-0 top-0 z-[2] lg:hidden" />
          {left}
        </div>

        <div className={`${CRYSTAL_WORKSTATION_MAIN} order-1 z-[2] lg:order-2`}>
          {main}
        </div>

        <div className="relative order-3 z-[2] min-w-0 max-lg:pt-3 lg:min-h-0 lg:overflow-hidden lg:pt-0">
          <CrystalRowGroove className="absolute inset-x-0 top-0 z-[2] lg:hidden" />
          {right}
        </div>
      </div>
    </div>
  )
}
