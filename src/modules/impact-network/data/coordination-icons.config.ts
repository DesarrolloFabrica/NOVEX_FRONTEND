import type { CoordinationId } from '@/modules/impact-network/data/coordination-islands.config'

const ICON_ROOT = '/iconos/display'
const DEFAULT_COORDINATION_ICON = `${ICON_ROOT}/IconoCoordGeneral.jpg`

/**
 * Identidad visual de la vista institucional. Las islas pertenecen al mapa de
 * detalle; este catálogo mantiene el tablero inicial reducido a iconos.
 */
const COORDINATION_ICON_BY_ID: Readonly<Record<string, string>> = {
  'coord-general': DEFAULT_COORDINATION_ICON,
  'coord-b2b': `${ICON_ROOT}/IconoB2B.png`,
  'coord-bellas-artes': `${ICON_ROOT}/IconoBellasArtes.jpg`,
  'coord-desarrollo-profesional': `${ICON_ROOT}/IconoDesarrolloprofesional.jpg`,
  'coord-empresarial': `${ICON_ROOT}/IconoDirectorOp.jpg`,
  'coord-especializaciones': `${ICON_ROOT}/IconoEspecializaciones.png`,
  'coord-fabrica-contenidos': `${ICON_ROOT}/IconoFabrica.png`,
  'coord-homologaciones': `${ICON_ROOT}/IconoHomologaciones.png`,
  'coord-ingenierias': `${ICON_ROOT}/IconoIngenieria.png`,
  'coord-negocios': `${ICON_ROOT}/IconoNegocios.jpg`,
  'coord-operaciones-academicas': `${ICON_ROOT}/IconoOPacademica.png`,
  'coord-proyeccion-social': `${ICON_ROOT}/IconoProySocial.png`,
  'coord-saber-pro': `${ICON_ROOT}/IconoSaberPro.jpg`,
  'coord-servicios': `${ICON_ROOT}/IconoServicios.jpg`,
  'coord-transversales': `${ICON_ROOT}/IconoTransversales.png`,
}

export function getCoordinationIconAsset(
  coordinationId: CoordinationId,
): string {
  return COORDINATION_ICON_BY_ID[coordinationId] ?? DEFAULT_COORDINATION_ICON
}

export function getCanonicalCoordinationIconAssets(): readonly string[] {
  return [...new Set(Object.values(COORDINATION_ICON_BY_ID))]
}
