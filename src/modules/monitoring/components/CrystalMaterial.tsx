// Capas de material del Cristal Maestro (solo presentación).
// Sprint 7.1: superficie óptica — inundación opal, núcleo dominante, cantos visibles.

import {
  CRYSTAL_AMBIENT_TRANSMISSION,
  CRYSTAL_BODY_DEPTH,
  CRYSTAL_CLEAR_CORE,
  CRYSTAL_EDGE_SHEEN,
  CRYSTAL_EDGE_VEIL,
  CRYSTAL_FACE_EXTERIOR,
  CRYSTAL_MACHINED_TOP_HIGHLIGHT,
  CRYSTAL_OPAL_FLOOD,
} from '@/modules/monitoring/constants/crystalMaterial'
import { CRYSTAL_LAMINATE_TINT } from '@/modules/monitoring/constants/materialTheme'
import {
  CRYSTAL_BREATH_FACE,
  CRYSTAL_BREATH_SHEEN,
} from '@/modules/monitoring/constants/operationalBreathing'

/** Estratos de emisión interna — panel retroiluminado de campo completo. */
export function CrystalMaterialLayers() {
  return (
    <div
      className="crystal-material-layers pointer-events-none absolute inset-0 z-0"
      aria-hidden="true"
    >
      <div className={`absolute inset-0 ${CRYSTAL_OPAL_FLOOD}`} />
      <div className={`absolute inset-0 ${CRYSTAL_BODY_DEPTH}`} />
      <div className={`absolute inset-0 ${CRYSTAL_AMBIENT_TRANSMISSION}`} />
      <div className={`absolute inset-0 ${CRYSTAL_CLEAR_CORE}`} />
      <div className={`absolute inset-0 ${CRYSTAL_FACE_EXTERIOR}`} />
      <div className={`absolute inset-0 ${CRYSTAL_EDGE_VEIL}`} />
      <div className={`absolute inset-x-0 bottom-0 h-12 ${CRYSTAL_LAMINATE_TINT}`} />
      <div className={`absolute inset-0 ${CRYSTAL_BREATH_FACE}`} />
      <div
        className={`absolute inset-x-0 top-0 h-16 ${CRYSTAL_MACHINED_TOP_HIGHLIGHT}`}
      />
      <div
        className={`absolute inset-x-0 top-0 h-24 ${CRYSTAL_EDGE_SHEEN} ${CRYSTAL_BREATH_SHEEN}`}
      />
    </div>
  )
}
