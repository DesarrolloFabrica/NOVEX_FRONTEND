// Capa: datos (mock) del módulo "areas".
// Responsabilidad: proveer el catálogo oficial de áreas institucionales.
// Más adelante este origen se reemplazará por una llamada a la API/servicio.

import type { Area } from '@/modules/areas/types/area.types'

/**
 * Catálogo oficial de áreas de Cunmark
 *
 * Regla de negocio:
 * - "Visión General Operaciones" es el área GLOBAL (isGlobal: true) y no posee
 *   compromisos propios; su salud se calcula agregando todas las áreas operativas.
 * - El resto son áreas operativas que generan y reportan compromisos.
 */
export const AREAS: Area[] = [
  {
    id: 'area-vision-general',
    code: 'VGO',
    name: 'Visión General Operaciones',
    description: 'Vista consolidada de la salud operativa de todas las áreas.',
    isGlobal: true,
  },
  {
    id: 'area-operacion-academica',
    code: 'COA',
    name: 'Coordinador de Operación Académica',
  },
  {
    id: 'area-fabrica-desarrollo',
    code: 'CFD',
    name: 'Coordinador de Fábrica y Desarrollo',
  },
  {
    id: 'area-innovacion-edu',
    code: 'LIT',
    name: 'Líder de Innovación y Transformación EDU',
  },
  {
    id: 'area-b2b',
    code: 'SB2B',
    name: 'Supervisor B2B',
  },
  {
    id: 'area-servicio',
    code: 'LSV',
    name: 'Líder de Servicio',
  },
  {
    id: 'area-pruebas-saber',
    code: 'CPS',
    name: 'Coordinadora Pruebas Saber',
  },
  {
    id: 'area-proyeccion-social',
    code: 'CPSO',
    name: 'Coordinador de Proyección Social',
  },
  {
    id: 'area-desarrollo-profesional',
    code: 'CDP',
    name: 'Coordinador de Desarrollo Profesional',
  },
]

/** Áreas operativas (todas excepto las globales). */
export const OPERATIONAL_AREAS: Area[] = AREAS.filter((area) => !area.isGlobal)

/** Área global del sistema (la primera marcada como isGlobal). */
export const GLOBAL_AREA: Area | undefined = AREAS.find((area) => area.isGlobal)
