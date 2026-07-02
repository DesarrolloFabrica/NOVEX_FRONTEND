// Capa: selectores del módulo "monitoring".
// Responsabilidad: adaptar/derivar datos del dominio para la vista, apoyándose
// en el motor puro. Aquí se decide QUÉ compromisos entran al cálculo (filtrado
// por área, agregación global), pero el CÓMO se calcula vive en el engine.

import type { Area } from '@/modules/areas/types/area.types'
import type { Commitment } from '@/modules/commitments/types/commitment.types'
import type { AreaHealth } from '@/modules/monitoring/types/monitoring.types'
import {
  calculateAreaHealth,
  calculateGlobalHealth,
} from '@/modules/monitoring/engine/health.engine'

/** Salud de un área específica: filtra sus compromisos y calcula su salud. */
export function selectAreaHealth(
  commitments: Commitment[],
  areaId: string,
): AreaHealth {
  const scoped = commitments.filter((c) => c.areaId === areaId)
  return calculateAreaHealth(scoped)
}

/** Salud global: agrega TODOS los compromisos sin filtrar por área. */
export function selectGlobalAreaHealth(commitments: Commitment[]): AreaHealth {
  return calculateGlobalHealth(commitments)
}

/** Resultado emparejado de un área con su salud calculada. */
export interface AreaHealthEntry {
  area: Area
  health: AreaHealth
}

/**
 * Salud de todas las áreas del catálogo.
 *
 * Regla: si el área es global, su salud se calcula con TODOS los compromisos;
 * si es operativa, solo con los compromisos de esa área.
 */
export function selectAllAreasHealth(
  commitments: Commitment[],
  areas: Area[],
): AreaHealthEntry[] {
  return areas.map((area) => ({
    area,
    health: area.isGlobal
      ? selectGlobalAreaHealth(commitments)
      : selectAreaHealth(commitments, area.id),
  }))
}
