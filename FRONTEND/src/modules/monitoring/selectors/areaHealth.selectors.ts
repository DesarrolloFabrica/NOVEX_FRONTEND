// Capa: selectores del módulo "monitoring".
// Responsabilidad: adaptar/derivar datos del dominio para la vista, apoyándose
// en el motor puro. Aquí se decide QUÉ compromisos entran al cálculo (filtrado
// por área, agregación global), pero el CÓMO se calcula vive en el engine.

import type { Area } from '@/modules/areas/types/area.types'
import { AREAS } from '@/modules/areas/data/areas.mock'
import type { Commitment } from '@/modules/commitments/types/commitment.types'
import type { AreaHealth } from '@/modules/monitoring/types/monitoring.types'
import {
  calculateAreaHealth,
  calculateGlobalHealth,
} from '@/modules/monitoring/engine/health.engine'

/** IDs de áreas globales (p. ej. Visión General Operaciones) — sin compromisos propios. */
const GLOBAL_AREA_IDS = new Set(
  AREAS.filter((area) => area.isGlobal).map((area) => area.id),
)

/**
 * Compromisos de todas las áreas operativas.
 * Incluye todo excepto compromisos etiquetados con un área global.
 */
export function selectAllOperationalCommitments(
  commitments: Commitment[],
): Commitment[] {
  return commitments.filter((c) => !GLOBAL_AREA_IDS.has(c.areaId))
}

/**
 * Compromisos visibles según el área enfocada.
 * Vista global (VGO): todos los compromisos de todas las áreas operativas.
 * Área operativa: solo los de esa área.
 */
export function selectFocusedAreaCommitments(
  commitments: Commitment[],
  selectedArea: Area | undefined,
): Commitment[] {
  if (!selectedArea) return []
  if (selectedArea.isGlobal) {
    return selectAllOperationalCommitments(commitments)
  }
  return commitments.filter((c) => c.areaId === selectedArea.id)
}

/** Salud de un área específica: filtra sus compromisos y calcula su salud. */
export function selectAreaHealth(
  commitments: Commitment[],
  areaId: string,
): AreaHealth {
  const scoped = commitments.filter((c) => c.areaId === areaId)
  return calculateAreaHealth(scoped)
}

/** Salud global: agrega compromisos de TODAS las áreas operativas. */
export function selectGlobalAreaHealth(commitments: Commitment[]): AreaHealth {
  return calculateGlobalHealth(selectAllOperationalCommitments(commitments))
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
