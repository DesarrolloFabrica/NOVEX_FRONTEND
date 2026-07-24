// Capa: utilidades del módulo "operational-events".
// Responsabilidad: helpers puros para resolver áreas y categorías del catálogo.

import type {
  IncidentCategory,
  OperationalArea,
} from '@/modules/operational-events/types/operational-event.types'

/** Devuelve un área por id, o undefined si no existe. */
export function findOperationalAreaById(
  areas: OperationalArea[],
  areaId: string,
): OperationalArea | undefined {
  return areas.find((area) => area.id === areaId)
}

/** Resuelve el nombre de un área; usa fallback si no se encuentra. */
export function resolveOperationalAreaName(
  areas: OperationalArea[],
  areaId: string,
  fallback = 'Área desconocida',
): string {
  return findOperationalAreaById(areas, areaId)?.name ?? fallback
}

/** Indica si el área es el agregador global. */
export function isGlobalOperationalArea(area: OperationalArea): boolean {
  return area.isGlobal === true
}

/** Devuelve una categoría por id, o undefined si no existe. */
export function findIncidentCategoryById(
  categories: IncidentCategory[],
  categoryId: string,
): IncidentCategory | undefined {
  return categories.find((category) => category.id === categoryId)
}

/** Resuelve el nombre de una categoría; usa fallback si no se encuentra. */
export function resolveIncidentCategoryName(
  categories: IncidentCategory[],
  categoryId: string,
  fallback = 'Categoría desconocida',
): string {
  return findIncidentCategoryById(categories, categoryId)?.name ?? fallback
}
