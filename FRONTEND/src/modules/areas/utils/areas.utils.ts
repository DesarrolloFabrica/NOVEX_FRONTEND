// Capa: utilidades del módulo "areas".
// Responsabilidad: helpers puros para resolver áreas desde el catálogo.
// Sin estado ni efectos: solo transformaciones de datos.

import type { Area } from '@/modules/areas/types/area.types'

/** Devuelve un área por su id, o undefined si no existe en el catálogo dado. */
export function findAreaById(areas: Area[], areaId: string): Area | undefined {
  return areas.find((area) => area.id === areaId)
}

/** Resuelve el nombre de un área por id; usa un fallback si no se encuentra. */
export function resolveAreaName(
  areas: Area[],
  areaId: string,
  fallback = 'Área desconocida',
): string {
  return findAreaById(areas, areaId)?.name ?? fallback
}

/** Indica si un área es global (consolida la salud de todas las demás). */
export function isGlobalArea(area: Area): boolean {
  return area.isGlobal === true
}
