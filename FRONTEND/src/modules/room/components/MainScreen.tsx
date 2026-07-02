// Componente: pantalla principal (Cristal Maestro) de la Sala O.M.E.G.A.
// Lámina técnica con material estratificado, espesor y tinte ambiental.
// Solo presentación — no altera layout ni composición del Centro.

import type { ReactNode } from 'react'
import type { RoomEnvironment } from '@/modules/room/constants/roomTheme'
import { CrystalMaterialLayers } from '@/modules/monitoring/components/CrystalMaterial'
import {
  CrystalBottomStateRule,
  CrystalMachinedPerimeter,
  CrystalSlab,
  CrystalStateEnvelope,
  CrystalSurfaceCorners,
  CrystalTopRail,
} from '@/modules/monitoring/components/CrystalStructure'
import { CRYSTAL_STATE_TRANSITION } from '@/modules/monitoring/constants/ambientLighting'
import {
  CRYSTAL_BREATH_AMBIENT,
  CRYSTAL_BREATH_BEVEL,
} from '@/modules/monitoring/constants/operationalBreathing'
import { CRYSTAL_LAMINATE_EDGE } from '@/modules/monitoring/constants/materialTheme'
import { CRYSTAL_BODY_BASE, CRYSTAL_CHAMFER_CLIP } from '@/modules/monitoring/constants/crystalMaterial'
import {
  CRYSTAL_PLANE_LIFT,
  PLANE_CRYSTAL,
  PLANE_ETCHED,
} from '@/modules/monitoring/constants/visualPlanes'
import { getRoomOperationalVisual, mainScreenBodyFill, mainScreenFill } from '@/modules/room/constants/roomTheme'

interface MainScreenProps {
  children: ReactNode
  /** Estado ambiental ya calculado aguas arriba (room no lo calcula). */
  environment?: RoomEnvironment
}

export function MainScreen({ children, environment }: MainScreenProps) {
  const visual = environment ? getRoomOperationalVisual(environment) : null

  return (
    <div className={`${PLANE_CRYSTAL} ${CRYSTAL_PLANE_LIFT} ${mainScreenFill}`}>
      <div className="lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
        <CrystalSlab edgeGlowClass={visual?.crystalStateEdgeGlow}>
        <div
          className={`relative overflow-x-hidden max-lg:overflow-y-visible lg:overflow-hidden ${CRYSTAL_CHAMFER_CLIP} ${CRYSTAL_BODY_BASE} ${CRYSTAL_LAMINATE_EDGE} ${mainScreenBodyFill} ${CRYSTAL_STATE_TRANSITION}`}
        >
          <CrystalMaterialLayers />
          <CrystalMachinedPerimeter />
          {visual ? <CrystalStateEnvelope visual={visual} /> : null}
          <CrystalSurfaceCorners />

          {visual && (
            <>
              <div
                aria-hidden="true"
                className={`pointer-events-none absolute inset-0 z-0 ${CRYSTAL_STATE_TRANSITION} ${CRYSTAL_BREATH_AMBIENT} ${visual.crystalTint}`}
              />
              <div
                aria-hidden="true"
                className={`pointer-events-none absolute inset-x-0 top-0 z-0 h-24 ${CRYSTAL_STATE_TRANSITION} ${CRYSTAL_BREATH_BEVEL} ${visual.crystalSheen}`}
              />
            </>
          )}

          <CrystalTopRail
            accentClass={visual?.mainRail}
            structuralAccentClass={visual?.crystalStateStructuralAccent}
          />
          {visual ? (
            <CrystalBottomStateRule structuralAccentClass={visual.crystalStateStructuralAccent} />
          ) : null}

          <div className={`${PLANE_ETCHED} relative lg:min-h-0 lg:flex-1 lg:overflow-hidden`}>
            {children}
          </div>
        </div>
      </CrystalSlab>
      </div>
    </div>
  )
}
