// Componente: rejilla del Cristal Maestro (Plano 1).
// Sprint 7.3: estación de trabajo unificada — una losa, zonas funcionales.

import type { ReactNode } from 'react'
import {
  CrystalFieldAnchors,
  CrystalRowGroove,
} from '@/modules/monitoring/components/CrystalStructure'
import {
  CRYSTAL_GRID,
  CRYSTAL_WORKSTATION_MAIN,
  CRYSTAL_WORKSTATION_PLATE,
  ROOM_CONTAINER,
} from '@/modules/monitoring/constants/monitoringTheme'
import { PLANE_ETCHED } from '@/modules/monitoring/constants/visualPlanes'

interface MonitoringLayoutProps {
  left?: ReactNode
  main: ReactNode
  right?: ReactNode
  showFieldAnchors?: boolean
}

export function MonitoringLayout({
  left,
  main,
  right,
  showFieldAnchors = true,
}: MonitoringLayoutProps) {
  const hasLeft = left != null && left !== false
  const hasRight = right != null && right !== false
  const isFullMain = !hasLeft && !hasRight
  const layoutClass = [
    hasLeft ? '' : 'novex-workstation--no-left',
    hasRight ? '' : 'novex-workstation--no-right',
    isFullMain ? 'novex-workstation--full-main' : '',
  ]
    .filter(Boolean)
    .join(' ')

  // Vista a ancho completo: sin grabados ni canales laterales (evitan reborde fantasma).
  const plateClass = isFullMain
    ? 'relative'
    : `${PLANE_ETCHED} ${CRYSTAL_WORKSTATION_PLATE}`
  const mainClass = isFullMain
    ? 'relative flex min-h-0 min-w-0 flex-col'
    : CRYSTAL_WORKSTATION_MAIN

  return (
    <div className={`${ROOM_CONTAINER} relative max-lg:overflow-visible lg:overflow-hidden`}>
      <div
        className={`novex-workstation ${plateClass} relative flex min-h-0 flex-1 flex-col ${isFullMain ? 'lg:grid lg:min-h-0 lg:flex-1 lg:overflow-hidden lg:grid-cols-1 lg:grid-rows-[minmax(0,1fr)]' : CRYSTAL_GRID} ${layoutClass}`}
      >
        {isFullMain || !showFieldAnchors ? null : <CrystalFieldAnchors />}

        {hasLeft ? (
          <div className="novex-workstation__left relative order-2 z-[2] min-w-0 max-lg:pt-3 lg:order-1 lg:flex lg:min-h-0 lg:flex-col lg:overflow-hidden lg:pt-0">
            <CrystalRowGroove className="absolute inset-x-0 top-0 z-[2] lg:hidden" />
            {left}
          </div>
        ) : null}

        <div className={`novex-workstation__main ${mainClass} order-1 z-[2] lg:order-2`}>
          {main}
        </div>

        {hasRight ? (
          <div className="novex-workstation__right relative order-3 z-[2] min-w-0 max-lg:pt-3 lg:flex lg:min-h-0 lg:flex-col lg:overflow-hidden lg:pt-0">
            <CrystalRowGroove className="absolute inset-x-0 top-0 z-[2] lg:hidden" />
            {right}
          </div>
        ) : null}
      </div>
    </div>
  )
}
