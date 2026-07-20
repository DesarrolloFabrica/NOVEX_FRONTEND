// Capas de material del Cristal Maestro (solo presentación).
// Sprint 7.1: superficie óptica — inundación opal, núcleo dominante, cantos visibles.

import {
  CRYSTAL_BODY_DEPTH,
  CRYSTAL_FACE_EXTERIOR,
  CRYSTAL_OPAL_FLOOD,
} from '@/modules/monitoring/constants/crystalMaterial'
import { PLANE_SCREEN_SIGNAL } from '@/modules/monitoring/constants/visualPlanes'

/** Estratos de emisión interna — panel retroiluminado de campo completo. */
export function CrystalMaterialLayers() {
  return (
    <div
      className="crystal-material-layers pointer-events-none absolute inset-0 z-0"
      aria-hidden="true"
    >
      <div className={`absolute inset-0 ${CRYSTAL_OPAL_FLOOD}`} />
      <div className={`absolute inset-0 ${CRYSTAL_BODY_DEPTH}`} />
      <div className={`absolute inset-0 ${CRYSTAL_FACE_EXTERIOR}`} />
    </div>
  )
}

/** Textura electrónica neutral, separada del contenido operativo. */
export function ScreenSignalLayer() {
  return <div className={`screen-signal-layer ${PLANE_SCREEN_SIGNAL}`} aria-hidden="true" />
}
